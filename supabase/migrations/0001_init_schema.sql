-- COLIMO — schéma initial (MVP V1)
-- Traduit le modèle de données de docs/COLIMO_CONTEXTE_PROJET.md §3

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_type as enum ('client', 'coursier', 'admin');

create type zone as enum ('libreville', 'akanda', 'owendo', 'bikele_essassa', 'ntoum');

create type vehicule_type as enum ('moto', 'velo', 'voiture', 'pied');

create type verification_status as enum ('en_attente', 'valide', 'rejete');

create type course_status as enum (
  'en_attente',   -- publiée, en recherche de coursier
  'acceptee',     -- prise par un coursier
  'en_cours',     -- colis récupéré, en livraison
  'livree',       -- livrée, en attente de confirmation client
  'confirmee',    -- confirmée + payée
  'annulee',
  'litige'
);

create type payment_operator as enum ('airtel_money', 'moov_money');

create type payment_status as enum ('en_attente', 'reussi', 'echoue', 'rembourse');

-- ---------------------------------------------------------------------------
-- Fonction utilitaire : maj automatique de updated_at
-- ---------------------------------------------------------------------------

create function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Table : utilisateurs
-- id = auth.users.id (une ligne utilisateurs par compte Supabase Auth)
-- ---------------------------------------------------------------------------

create table utilisateurs (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text not null,
  telephone text not null unique,
  type user_type not null default 'client',
  zone zone,
  statut text not null default 'actif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger utilisateurs_set_updated_at
  before update on utilisateurs
  for each row execute function set_updated_at();

-- Helper RLS : type de l'utilisateur courant
create function current_user_type()
returns user_type
language sql
stable
security definer
set search_path = public
as $$
  select type from utilisateurs where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Table : coursiers
-- ---------------------------------------------------------------------------

create table coursiers (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null unique references utilisateurs (id) on delete cascade,
  documents jsonb not null default '[]'::jsonb, -- URLs Supabase Storage (pièce d'identité, permis, etc.)
  type_vehicule vehicule_type not null,
  statut_verification verification_status not null default 'en_attente',
  disponibilite boolean not null default false,
  note_moyenne numeric(2, 1) not null default 0 check (note_moyenne >= 0 and note_moyenne <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger coursiers_set_updated_at
  before update on coursiers
  for each row execute function set_updated_at();

create index coursiers_disponibilite_idx on coursiers (disponibilite) where disponibilite = true;

-- ---------------------------------------------------------------------------
-- Table : courses
-- ---------------------------------------------------------------------------

create table courses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references utilisateurs (id),
  coursier_id uuid references utilisateurs (id),
  adresse_depart text not null,
  adresse_arrivee text not null,
  zone_depart zone not null,
  zone_arrivee zone not null,
  type_colis text not null,
  livraison_prioritaire boolean not null default false,
  valeur_declaree numeric(10, 2),
  prix numeric(10, 2) not null check (prix >= 0),
  statut course_status not null default 'en_attente',
  created_at timestamptz not null default now(),
  acceptee_at timestamptz,
  recuperee_at timestamptz,
  livree_at timestamptz,
  confirmee_at timestamptz,
  annulee_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger courses_set_updated_at
  before update on courses
  for each row execute function set_updated_at();

create index courses_statut_zone_idx on courses (statut, zone_depart);
create index courses_client_idx on courses (client_id);
create index courses_coursier_idx on courses (coursier_id);

-- ---------------------------------------------------------------------------
-- Table : transactions
-- ---------------------------------------------------------------------------

create table transactions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references courses (id) on delete cascade,
  montant numeric(10, 2) not null check (montant >= 0),
  commission_plateforme numeric(10, 2) not null default 0,
  operateur payment_operator not null,
  reference text not null,
  statut_paiement payment_status not null default 'en_attente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger transactions_set_updated_at
  before update on transactions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Table : notations
-- ---------------------------------------------------------------------------

create table notations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  auteur_id uuid not null references utilisateurs (id),
  destinataire_id uuid not null references utilisateurs (id),
  note smallint not null check (note between 1 and 5),
  commentaire text,
  created_at timestamptz not null default now(),
  unique (course_id, auteur_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table utilisateurs enable row level security;
alter table coursiers enable row level security;
alter table courses enable row level security;
alter table transactions enable row level security;
alter table notations enable row level security;

-- utilisateurs
create policy "utilisateurs_select_own_or_admin"
  on utilisateurs for select
  using (id = auth.uid() or current_user_type() = 'admin');

create policy "utilisateurs_update_own"
  on utilisateurs for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- coursiers
create policy "coursiers_select_own_admin_or_client_assigned"
  on coursiers for select
  using (
    utilisateur_id = auth.uid()
    or current_user_type() = 'admin'
    or utilisateur_id in (select coursier_id from courses where client_id = auth.uid())
  );

create policy "coursiers_update_own_or_admin"
  on coursiers for update
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin')
  with check (utilisateur_id = auth.uid() or current_user_type() = 'admin');

create policy "coursiers_insert_own"
  on coursiers for insert
  with check (utilisateur_id = auth.uid());

-- courses
create policy "courses_select_client_coursier_or_admin"
  on courses for select
  using (
    client_id = auth.uid()
    or coursier_id = auth.uid()
    or current_user_type() = 'admin'
    or (
      statut = 'en_attente'
      and current_user_type() = 'coursier'
      and zone_depart = (select zone from utilisateurs where id = auth.uid())
    )
  );

create policy "courses_insert_client"
  on courses for insert
  with check (client_id = auth.uid());

create policy "courses_update_client_coursier_or_admin"
  on courses for update
  using (client_id = auth.uid() or coursier_id = auth.uid() or current_user_type() = 'admin')
  with check (client_id = auth.uid() or coursier_id = auth.uid() or current_user_type() = 'admin');

-- transactions
create policy "transactions_select_participants_or_admin"
  on transactions for select
  using (
    current_user_type() = 'admin'
    or course_id in (select id from courses where client_id = auth.uid() or coursier_id = auth.uid())
  );

-- notations
create policy "notations_select_participants_or_admin"
  on notations for select
  using (
    current_user_type() = 'admin'
    or auteur_id = auth.uid()
    or destinataire_id = auth.uid()
  );

create policy "notations_insert_auteur"
  on notations for insert
  with check (auteur_id = auth.uid());
