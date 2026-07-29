-- Fiche commerçant (infos complémentaires pour les clients type "commerce") :
-- adresse, responsable, horaires, taux de commission. Un commerçant = un
-- utilisateur existant (type client, type_client='commerce') enrichi ici.
create table commercants (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null unique references utilisateurs(id) on delete cascade,
  adresse text,
  responsable text,
  horaires text,
  commission_taux numeric not null default 0.15,
  created_at timestamptz not null default now()
);

alter table commercants enable row level security;

create policy "commercants_select_own_or_admin"
  on commercants for select
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin');

create policy "commercants_insert_own_or_admin"
  on commercants for insert
  with check (utilisateur_id = auth.uid() or current_user_type() = 'admin');

create policy "commercants_update_own_or_admin"
  on commercants for update
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin')
  with check (utilisateur_id = auth.uid() or current_user_type() = 'admin');

-- Codes promo : lecture ouverte à tout utilisateur connecté (nécessaire pour
-- valider un code au moment de publier une course), écriture réservée à l'admin.
create table codes_promo (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type_reduction text not null check (type_reduction in ('pourcentage', 'montant_fixe')),
  valeur numeric not null,
  actif boolean not null default true,
  date_debut timestamptz,
  date_fin timestamptz,
  usage_max integer,
  usage_actuel integer not null default 0,
  created_at timestamptz not null default now()
);

alter table codes_promo enable row level security;

create policy "codes_promo_select_authenticated"
  on codes_promo for select
  using (auth.role() = 'authenticated');

create policy "codes_promo_all_admin"
  on codes_promo for all
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

alter table courses
  add column if not exists code_promo_id uuid references codes_promo(id),
  add column if not exists reduction_promo numeric not null default 0;
