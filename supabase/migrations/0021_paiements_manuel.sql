-- Paiement manuel Airtel Money (Phase 1) : aucun agrégateur, aucune API
-- Airtel Money à ce stade. Le client/commerçant paie les frais de livraison
-- sur un numéro Airtel Money COLIMO, déclare son paiement, un admin valide
-- ou rejette manuellement. Module indépendant (packages/shared/src/paiements)
-- pour permettre de remplacer ce fournisseur manuel par une vraie API plus
-- tard sans toucher au module des commandes.

-- Nouveau statut de course : la course reste invisible des coursiers tant
-- que le paiement (mode mobile_money) n'est pas confirmé par un admin.
alter type course_status add value if not exists 'en_attente_paiement';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'statut_paiement_manuel') then
    create type statut_paiement_manuel as enum (
      'en_attente_paiement',
      'paiement_declare',
      'en_attente_validation',
      'paiement_confirme',
      'paiement_rejete'
    );
  end if;
end $$;

create sequence if not exists paiements_reference_seq;

-- Réutilise le type payment_operator existant (airtel_money / moov_money,
-- migration 0001) plutôt que d'en recréer un identique.
create table if not exists paiements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references courses (id) on delete cascade,
  utilisateur_id uuid not null references utilisateurs (id),
  reference text not null unique
    default ('COL-' || lpad(nextval('paiements_reference_seq')::text, 6, '0')),
  montant_attendu numeric(10, 2) not null check (montant_attendu >= 0),
  montant_paye numeric(10, 2),
  reseau payment_operator,
  numero_payeur text,
  reference_transaction text,
  date_paiement_declaree timestamptz,
  capture_url text,
  statut statut_paiement_manuel not null default 'en_attente_paiement',
  valide_par uuid references utilisateurs (id),
  valide_at timestamptz,
  motif_rejet text,
  declare_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paiements_statut_idx on paiements (statut);
create index if not exists paiements_utilisateur_idx on paiements (utilisateur_id);

drop trigger if exists paiements_set_updated_at on paiements;
create trigger paiements_set_updated_at
  before update on paiements
  for each row execute function set_updated_at();

alter table paiements enable row level security;

drop policy if exists "paiements_select_own_or_admin" on paiements;
create policy "paiements_select_own_or_admin"
  on paiements for select
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin');

drop policy if exists "paiements_insert_own_or_admin" on paiements;
create policy "paiements_insert_own_or_admin"
  on paiements for insert
  with check (utilisateur_id = auth.uid() or current_user_type() = 'admin');

drop policy if exists "paiements_update_own_or_admin" on paiements;
create policy "paiements_update_own_or_admin"
  on paiements for update
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin')
  with check (utilisateur_id = auth.uid() or current_user_type() = 'admin');

-- Modèles de notification pour la confirmation/le rejet de paiement (cf.
-- packages/shared/src/notifications/evenements.ts).
insert into modeles_notification (code, type, nom, contenu, variables) values
  ('whatsapp_paiement_confirme', 'whatsapp', 'Paiement confirmé',
   E'Bonjour {{nom_client}},\n\nVotre paiement a été confirmé.\nVotre livraison est en cours de traitement.\n\nRéférence :\n{{reference}}',
   array['nom_client', 'reference']),
  ('whatsapp_paiement_rejete', 'whatsapp', 'Paiement rejeté',
   E'Bonjour {{nom_client}},\n\nVotre paiement n''a pas pu être confirmé.\nMerci de vérifier les informations transmises ou de contacter le support.\n\nRéférence :\n{{reference}}',
   array['nom_client', 'reference'])
on conflict (code) do nothing;
