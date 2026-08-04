-- Module Notifications indépendant : historique, modèles de messages, et
-- codes OTP (architecture préparée, aucun fournisseur externe connecté).
-- Le reste de l'application ne doit jamais appeler un fournisseur externe
-- directement ; tout passe par packages/shared/src/notifications.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'type_notification') then
    create type type_notification as enum ('sms', 'whatsapp', 'email', 'push');
  end if;
  if not exists (select 1 from pg_type where typname = 'statut_notification') then
    create type statut_notification as enum ('en_attente', 'envoye', 'livre', 'lu', 'echec');
  end if;
  if not exists (select 1 from pg_type where typname = 'objectif_otp') then
    create type objectif_otp as enum (
      'verification_telephone',
      'reinitialisation_mdp',
      'double_authentification',
      'validation_commercant',
      'validation_coursier'
    );
  end if;
end $$;

-- Modèles de messages : jamais de texte codé en dur, tout passe par ici.
create table if not exists modeles_notification (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type type_notification not null,
  nom text not null,
  sujet text,
  contenu text not null,
  variables text[] not null default '{}',
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists modeles_notification_set_updated_at on modeles_notification;
create trigger modeles_notification_set_updated_at
  before update on modeles_notification
  for each row execute function set_updated_at();

alter table modeles_notification enable row level security;

drop policy if exists "modeles_notification_select_authenticated" on modeles_notification;
create policy "modeles_notification_select_authenticated"
  on modeles_notification for select
  using (auth.role() = 'authenticated');

drop policy if exists "modeles_notification_all_admin" on modeles_notification;
create policy "modeles_notification_all_admin"
  on modeles_notification for all
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

-- Historique de toutes les notifications envoyées (ou tentées), quel que
-- soit le canal.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid references utilisateurs (id),
  declenche_par uuid not null references utilisateurs (id),
  type type_notification not null,
  destinataire text not null,
  modele_code text references modeles_notification (code),
  contenu text not null,
  statut statut_notification not null default 'en_attente',
  erreur text,
  created_at timestamptz not null default now(),
  envoye_at timestamptz,
  livre_at timestamptz,
  lu_at timestamptz
);

alter table notifications enable row level security;

drop policy if exists "notifications_select_admin" on notifications;
create policy "notifications_select_admin"
  on notifications for select
  using (current_user_type() = 'admin' or declenche_par = auth.uid());

drop policy if exists "notifications_insert_authenticated" on notifications;
create policy "notifications_insert_authenticated"
  on notifications for insert
  with check (declenche_par = auth.uid());

drop policy if exists "notifications_update_own_or_admin" on notifications;
create policy "notifications_update_own_or_admin"
  on notifications for update
  using (declenche_par = auth.uid() or current_user_type() = 'admin')
  with check (declenche_par = auth.uid() or current_user_type() = 'admin');

-- Codes OTP : architecture prête, non branchée sur l'authentification
-- actuelle (email + mot de passe) ni sur un fournisseur SMS réel.
create table if not exists codes_otp (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid references utilisateurs (id),
  destinataire text not null,
  code text not null,
  objectif objectif_otp not null,
  expire_at timestamptz not null,
  utilise boolean not null default false,
  created_at timestamptz not null default now()
);

alter table codes_otp enable row level security;

drop policy if exists "codes_otp_select_own_or_admin" on codes_otp;
create policy "codes_otp_select_own_or_admin"
  on codes_otp for select
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin');

drop policy if exists "codes_otp_insert_own_or_admin" on codes_otp;
create policy "codes_otp_insert_own_or_admin"
  on codes_otp for insert
  with check (utilisateur_id = auth.uid() or utilisateur_id is null or current_user_type() = 'admin');

drop policy if exists "codes_otp_update_own_or_admin" on codes_otp;
create policy "codes_otp_update_own_or_admin"
  on codes_otp for update
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin')
  with check (utilisateur_id = auth.uid() or current_user_type() = 'admin');

-- Modèles par défaut (catalogue d'événements, cf. packages/shared/src/notifications/evenements.ts).
insert into modeles_notification (code, type, nom, contenu, variables) values
  ('sms_otp', 'sms', 'Code de vérification OTP',
   E'Votre code COLIMO est : {{otp}}\n\nCe code expire dans {{minutes}} minutes.',
   array['otp', 'minutes']),
  ('whatsapp_livraison_creee', 'whatsapp', 'Nouvelle livraison créée',
   E'Bonjour {{nom_client}},\n\nVotre demande de livraison COLIMO ({{numero_commande}}) a été enregistrée. Un coursier va bientôt être assigné.',
   array['nom_client', 'numero_commande']),
  ('whatsapp_coursier_attribue', 'whatsapp', 'Coursier attribué',
   E'Bonjour {{nom_client}},\n\nUn coursier a été assigné à votre commande {{numero_commande}} : {{nom_coursier}} ({{telephone}}).',
   array['nom_client', 'numero_commande', 'nom_coursier', 'telephone']),
  ('whatsapp_coursier_en_route', 'whatsapp', 'Coursier en route (non déclenché)',
   E'Bonjour {{nom_client}},\n\n{{nom_coursier}} est en route vers le point de récupération de votre commande {{numero_commande}}.',
   array['nom_client', 'numero_commande', 'nom_coursier']),
  ('whatsapp_colis_recupere', 'whatsapp', 'Colis récupéré',
   E'Bonjour {{nom_client}},\n\nVotre colis ({{numero_commande}}) a été récupéré par {{nom_coursier}} et est en route.',
   array['nom_client', 'numero_commande', 'nom_coursier']),
  ('whatsapp_livraison_en_cours', 'whatsapp', 'Livraison en cours',
   E'Bonjour {{nom_client}}\n\nVotre colis est en cours de livraison.\n\nCoursier :\n{{nom_coursier}}\n\nTéléphone :\n{{telephone}}\n\nTemps estimé :\n{{temps}}',
   array['nom_client', 'nom_coursier', 'telephone', 'temps']),
  ('whatsapp_livraison_terminee', 'whatsapp', 'Livraison effectuée',
   E'Bonjour {{nom_client}}\n\nVotre colis a été livré avec succès.\n\nMerci d''avoir utilisé COLIMO.',
   array['nom_client']),
  ('whatsapp_livraison_annulee', 'whatsapp', 'Livraison annulée',
   E'Bonjour {{nom_client}},\n\nVotre livraison {{numero_commande}} a été annulée.',
   array['nom_client', 'numero_commande']),
  ('whatsapp_litige_ouvert', 'whatsapp', 'Litige ouvert',
   E'Bonjour {{nom_client}},\n\nNous avons bien reçu votre signalement concernant la commande {{numero_commande}}. Notre équipe l''examine.',
   array['nom_client', 'numero_commande']),
  ('whatsapp_litige_resolu', 'whatsapp', 'Litige résolu',
   E'Bonjour {{nom_client}},\n\nVotre litige concernant la commande {{numero_commande}} a été résolu : {{resolution}}.',
   array['nom_client', 'numero_commande', 'resolution'])
on conflict (code) do nothing;
