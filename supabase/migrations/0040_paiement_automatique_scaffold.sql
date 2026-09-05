-- Paiement mobile money automatisé — architecture prête à brancher, sans
-- identifiants API Airtel Money/Moov Money pour l'instant. Le flux manuel
-- existant (0021 : déclaration client + validation admin) reste le
-- comportement PAR DÉFAUT et n'est en rien modifié — cette migration
-- n'ajoute que ce qu'il faut pour activer un jour un vrai fournisseur
-- (webhook confirmé -> même transition que validerPaiement) sans toucher
-- au module des commandes, exactement dans l'esprit du commentaire de 0021.

-- Distinct de reference_transaction (saisi par le client dans le flux
-- manuel, jamais garanti unique) : identifiant renvoyé par le fournisseur
-- lui-même lors d'une confirmation automatique, utilisé pour l'idempotence
-- du webhook (un même événement rejoué ne doit pas être traité deux fois).
alter table paiements add column if not exists transaction_externe_id text unique;
alter table paiements add column if not exists mode text not null default 'manuel' check (mode in ('manuel', 'automatique'));

-- Configuration à bascule unique (même principe que
-- configuration_paiement_abonnements, 0031) : `actif` reste à false tant
-- qu'aucun identifiant réel n'est configuré côté Vercel (les identifiants
-- eux-mêmes ne sont jamais stockés ici, seulement l'état d'activation et
-- le fournisseur choisi) — le flux manuel continue de fonctionner tel quel
-- si `actif` est false.
create table if not exists configuration_paiements_automatiques (
  id int primary key default 1 check (id = 1),
  actif boolean not null default false,
  fournisseur text check (fournisseur in ('airtel_money', 'moov_money')),
  mis_a_jour_par uuid references utilisateurs (id),
  mis_a_jour_at timestamptz not null default now()
);
insert into configuration_paiements_automatiques (id, actif) values (1, false) on conflict (id) do nothing;

alter table configuration_paiements_automatiques enable row level security;

create policy "configuration_paiements_automatiques_select_authenticated"
  on configuration_paiements_automatiques for select
  to authenticated
  using (true);

create policy "configuration_paiements_automatiques_update_admin"
  on configuration_paiements_automatiques for update
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

-- Journal brut de chaque appel webhook reçu (fournisseur, corps de la
-- requête, résultat du traitement) — indispensable pour diagnostiquer une
-- intégration qui n'a jamais encore été testée en conditions réelles.
-- Écriture réservée à la fonction serveur (clé service role, webhook) ;
-- lecture réservée à l'admin.
create table if not exists webhooks_paiement (
  id uuid primary key default gen_random_uuid(),
  fournisseur text not null,
  payload jsonb not null,
  traite boolean not null default false,
  erreur text,
  created_at timestamptz not null default now()
);

alter table webhooks_paiement enable row level security;

create policy "webhooks_paiement_select_admin"
  on webhooks_paiement for select
  using (current_user_type() = 'admin');

-- Confirmation automatique d'un paiement — appelée exclusivement par la
-- fonction serveur (clé service role, jamais par le client) après
-- vérification de la signature/authenticité du webhook fournisseur. Même
-- transition que validerPaiement (packages/shared/src/paiements/service.ts) :
-- statut paiement_confirme + la course redevient "en_attente" (à nouveau
-- visible et acceptable par les coursiers). Idempotent : un webhook rejoué
-- avec le même transaction_externe_id ne fait rien de plus (déjà confirmé).
create or replace function confirmer_paiement_automatique(
  p_paiement_id uuid,
  p_transaction_externe_id text,
  p_montant_paye numeric,
  p_reference_transaction text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_statut_actuel statut_paiement_manuel;
begin
  select statut, course_id into v_statut_actuel, v_course_id from paiements where id = p_paiement_id;

  if v_course_id is null then
    raise exception 'Paiement introuvable : %', p_paiement_id;
  end if;

  if v_statut_actuel = 'paiement_confirme' then
    return; -- déjà confirmé (webhook rejoué) : idempotent, rien à refaire.
  end if;

  update paiements
  set
    statut = 'paiement_confirme',
    montant_paye = p_montant_paye,
    reference_transaction = coalesce(p_reference_transaction, reference_transaction),
    transaction_externe_id = p_transaction_externe_id,
    mode = 'automatique',
    valide_at = now()
  where id = p_paiement_id;

  update courses set statut = 'en_attente' where id = v_course_id;
end;
$$;

grant execute on function confirmer_paiement_automatique(uuid, text, numeric, text) to service_role;
