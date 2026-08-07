-- Module Abonnements commerçants (COLIMO PRO) — 1/4 : schéma de base.
--
-- Trois paliers pour les comptes commerçants (gratuit/starter/business),
-- payés hors plateforme en V1 (Airtel Money, Moov Money, virement...),
-- activés manuellement par l'admin. L'abonnement débloque des outils
-- professionnels (carnet de destinataires, adresses, tableau de bord
-- avancé...) — la commande de courses reste gratuite pour tous les
-- commerces, avec ou sans abonnement.
--
-- Sécurité : commercants_update_own_or_admin (0011) autorise déjà
-- utilisateur_id = auth.uid() à écrire N'IMPORTE QUELLE colonne de sa
-- propre ligne commercants. Sans verrouillage, un commerçant pourrait
-- s'auto-attribuer le Pack Business via un appel API direct dès que les
-- colonnes ci-dessous existent — même trou que l'audit de sécurité
-- précédent (migrations 0028-0030), corrigé ici par un trigger dédié.

alter table commercants add column if not exists subscription_plan text not null default 'gratuit'
  check (subscription_plan in ('gratuit', 'starter', 'business'));
alter table commercants add column if not exists abonnement_debute_le timestamptz;
alter table commercants add column if not exists abonnement_expire_le timestamptz;
alter table commercants add column if not exists abonnement_suspendu boolean not null default false;

-- =====================================================================
-- demandes_abonnement
-- =====================================================================

create table if not exists demandes_abonnement (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commercants (id) on delete cascade,
  utilisateur_id uuid not null references utilisateurs (id),
  pack_demande text not null check (pack_demande in ('starter', 'business')),
  statut text not null default 'demande_envoyee'
    check (statut in ('demande_envoyee', 'en_attente_paiement', 'paiement_a_confirmer',
      'activation_en_cours', 'active', 'refuse', 'expire')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demandes_abonnement_commerce_idx on demandes_abonnement (commerce_id, created_at desc);

drop trigger if exists demandes_abonnement_set_updated_at on demandes_abonnement;
create trigger demandes_abonnement_set_updated_at
  before update on demandes_abonnement
  for each row execute function set_updated_at();

alter table demandes_abonnement enable row level security;

drop policy if exists "demandes_abonnement_select_own_or_admin" on demandes_abonnement;
create policy "demandes_abonnement_select_own_or_admin"
  on demandes_abonnement for select
  using (
    current_user_type() = 'admin'
    or commerce_id in (select id from commercants where utilisateur_id = auth.uid())
  );

-- Aucune policy insert/update directe : la création passe par la RPC
-- demander_activation_abonnement (0034, qui résout elle-même commerce_id/
-- utilisateur_id côté serveur) et les changements de statut par les RPC
-- d'administration — cohérent avec le durcissement de sécurité déjà en
-- place sur les tables privilégiées (0028-0030).

-- =====================================================================
-- historique_abonnements (audit append-only, même rôle que
-- historique_annulations pour les courses)
-- =====================================================================

create table if not exists historique_abonnements (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commercants (id) on delete cascade,
  administrateur_id uuid references utilisateurs (id),
  action text not null check (action in
    ('activation', 'renouvellement', 'desactivation', 'suspension', 'reactivation', 'expiration', 'refus')),
  ancien_forfait text,
  nouveau_forfait text,
  date_expiration timestamptz,
  motif text,
  commentaire text,
  created_at timestamptz not null default now()
);

create index if not exists historique_abonnements_commerce_idx on historique_abonnements (commerce_id, created_at desc);

alter table historique_abonnements enable row level security;

drop policy if exists "historique_abonnements_select_admin" on historique_abonnements;
create policy "historique_abonnements_select_admin"
  on historique_abonnements for select
  using (current_user_type() = 'admin');

-- Aucune policy insert : écriture exclusivement via les RPC d'administration (0034).

-- =====================================================================
-- configuration_paiement_abonnements — ligne unique, admin-éditable,
-- jamais codée en dur (numéro Airtel Money, bénéficiaire, instructions...)
-- =====================================================================

create table if not exists configuration_paiement_abonnements (
  id integer primary key default 1 check (id = 1),
  numero_paiement text not null default '',
  nom_beneficiaire text not null default '',
  moyen_paiement text not null default 'Airtel Money',
  instructions text not null default 'Pour activer votre abonnement, contactez COLIMO afin d''effectuer le paiement.',
  whatsapp text not null default '',
  email_contact text not null default '',
  updated_at timestamptz not null default now()
);

insert into configuration_paiement_abonnements (id) values (1) on conflict (id) do nothing;

drop trigger if exists configuration_paiement_abonnements_set_updated_at on configuration_paiement_abonnements;
create trigger configuration_paiement_abonnements_set_updated_at
  before update on configuration_paiement_abonnements
  for each row execute function set_updated_at();

alter table configuration_paiement_abonnements enable row level security;

drop policy if exists "configuration_paiement_abonnements_select_authenticated" on configuration_paiement_abonnements;
create policy "configuration_paiement_abonnements_select_authenticated"
  on configuration_paiement_abonnements for select
  using (auth.role() = 'authenticated');

drop policy if exists "configuration_paiement_abonnements_update_admin" on configuration_paiement_abonnements;
create policy "configuration_paiement_abonnements_update_admin"
  on configuration_paiement_abonnements for update
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

-- =====================================================================
-- Verrouillage des colonnes d'abonnement sur commercants
-- =====================================================================

create or replace function proteger_colonnes_privilegiees_commercants()
returns trigger
language plpgsql
as $$
begin
  if current_setting('colimo.systeme_interne', true) = 'true' then
    return new;
  end if;

  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  if new.subscription_plan is distinct from old.subscription_plan then
    new.subscription_plan := old.subscription_plan;
  end if;
  if new.abonnement_debute_le is distinct from old.abonnement_debute_le then
    new.abonnement_debute_le := old.abonnement_debute_le;
  end if;
  if new.abonnement_expire_le is distinct from old.abonnement_expire_le then
    new.abonnement_expire_le := old.abonnement_expire_le;
  end if;
  if new.abonnement_suspendu is distinct from old.abonnement_suspendu then
    new.abonnement_suspendu := old.abonnement_suspendu;
  end if;

  return new;
end;
$$;

drop trigger if exists commercants_proteger_colonnes on commercants;
create trigger commercants_proteger_colonnes
  before update on commercants
  for each row execute function proteger_colonnes_privilegiees_commercants();
