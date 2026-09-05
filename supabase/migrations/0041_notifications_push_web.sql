-- Notifications push web (PWA) — Service Worker + Web Push standard,
-- aucun service tiers propriétaire (Firebase Cloud Messaging etc.), juste
-- des clés VAPID. S'ajoute au canal "push" existant (Communication Center)
-- sans rien changer à son fonctionnement actuel : chaque événement
-- "notification_*" continue d'être enregistré dans `notifications` (visible
-- dans la cloche in-app) ET déclenche désormais en plus un vrai push
-- navigateur si l'utilisateur y est abonné sur au moins un appareil.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs (id) on delete cascade,
  -- Un endpoint identifie un couple (navigateur, service de push) unique :
  -- si un autre compte se connecte plus tard sur le même appareil/navigateur,
  -- l'upsert sur ce conflit transfère simplement l'abonnement au nouveau
  -- compte plutôt que d'échouer.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_utilisateur_idx on push_subscriptions (utilisateur_id);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_insert_own"
  on push_subscriptions for insert
  with check (utilisateur_id = auth.uid());

create policy "push_subscriptions_select_own"
  on push_subscriptions for select
  using (utilisateur_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on push_subscriptions for delete
  using (utilisateur_id = auth.uid());

-- La fonction serveur d'envoi (clé service role, apps/mobile/api/push/envoyer.ts)
-- contourne cette RLS pour lire les abonnements de l'utilisateur ciblé par
-- un événement de notification — jamais un accès direct depuis le client.
