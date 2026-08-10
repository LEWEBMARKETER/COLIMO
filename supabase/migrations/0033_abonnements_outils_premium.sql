-- Module Abonnements commerçants — 3/4 : outils premium (carnet de
-- destinataires, adresses favorites, points de départ, coursiers favoris).
-- Chaque table protège sa propre création par un trigger qui vérifie le
-- palier effectif du commerce (jamais uniquement côté frontend, section 13
-- du besoin) — la lecture/suppression restent toujours possibles même
-- après un downgrade, seule la CRÉATION de nouvelles lignes est bloquée :
-- aucune donnée n'est jamais perdue lors d'un changement de palier.

-- =====================================================================
-- Carnet de destinataires (Starter, max 100)
-- =====================================================================

create table if not exists commerce_destinataires (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commercants (id) on delete cascade,
  nom text not null,
  telephone text not null,
  adresse text,
  instructions text,
  created_at timestamptz not null default now()
);

create index if not exists commerce_destinataires_commerce_idx on commerce_destinataires (commerce_id);

alter table commerce_destinataires enable row level security;

drop policy if exists "commerce_destinataires_all_own_or_admin" on commerce_destinataires;
create policy "commerce_destinataires_all_own_or_admin"
  on commerce_destinataires for all
  using (current_user_type() = 'admin' or commerce_id in (select id from commercants where utilisateur_id = auth.uid()))
  with check (current_user_type() = 'admin' or commerce_id in (select id from commercants where utilisateur_id = auth.uid()));

create or replace function proteger_creation_commerce_destinataires()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_nb integer;
begin
  v_plan := plan_effectif_commerce(new.commerce_id);
  if v_plan not in ('starter', 'business') then
    raise exception 'Le carnet de destinataires nécessite le Pack Starter ou supérieur.';
  end if;

  select count(*) into v_nb from commerce_destinataires where commerce_id = new.commerce_id;
  if v_nb >= 100 then
    raise exception 'Limite de 100 destinataires atteinte pour le Pack Starter.';
  end if;

  return new;
end;
$$;

drop trigger if exists commerce_destinataires_proteger_creation on commerce_destinataires;
create trigger commerce_destinataires_proteger_creation
  before insert on commerce_destinataires
  for each row execute function proteger_creation_commerce_destinataires();

-- =====================================================================
-- Adresses favorites (Starter, max 10)
-- =====================================================================

create table if not exists commerce_adresses_favorites (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commercants (id) on delete cascade,
  label text not null,
  adresse text not null,
  repere text,
  zone zone,
  created_at timestamptz not null default now()
);

create index if not exists commerce_adresses_favorites_commerce_idx on commerce_adresses_favorites (commerce_id);

alter table commerce_adresses_favorites enable row level security;

drop policy if exists "commerce_adresses_favorites_all_own_or_admin" on commerce_adresses_favorites;
create policy "commerce_adresses_favorites_all_own_or_admin"
  on commerce_adresses_favorites for all
  using (current_user_type() = 'admin' or commerce_id in (select id from commercants where utilisateur_id = auth.uid()))
  with check (current_user_type() = 'admin' or commerce_id in (select id from commercants where utilisateur_id = auth.uid()));

create or replace function proteger_creation_commerce_adresses_favorites()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_nb integer;
begin
  v_plan := plan_effectif_commerce(new.commerce_id);
  if v_plan not in ('starter', 'business') then
    raise exception 'Les adresses favorites nécessitent le Pack Starter ou supérieur.';
  end if;

  select count(*) into v_nb from commerce_adresses_favorites where commerce_id = new.commerce_id;
  if v_nb >= 10 then
    raise exception 'Limite de 10 adresses favorites atteinte pour le Pack Starter.';
  end if;

  return new;
end;
$$;

drop trigger if exists commerce_adresses_favorites_proteger_creation on commerce_adresses_favorites;
create trigger commerce_adresses_favorites_proteger_creation
  before insert on commerce_adresses_favorites
  for each row execute function proteger_creation_commerce_adresses_favorites();

-- =====================================================================
-- Points de départ multiples (Business)
-- =====================================================================

create table if not exists commerce_points_depart (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commercants (id) on delete cascade,
  label text not null,
  adresse text not null,
  repere text,
  zone zone,
  latitude numeric,
  longitude numeric,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists commerce_points_depart_commerce_idx on commerce_points_depart (commerce_id);

alter table commerce_points_depart enable row level security;

drop policy if exists "commerce_points_depart_all_own_or_admin" on commerce_points_depart;
create policy "commerce_points_depart_all_own_or_admin"
  on commerce_points_depart for all
  using (current_user_type() = 'admin' or commerce_id in (select id from commercants where utilisateur_id = auth.uid()))
  with check (current_user_type() = 'admin' or commerce_id in (select id from commercants where utilisateur_id = auth.uid()));

create or replace function proteger_creation_commerce_points_depart()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_nb integer;
begin
  v_plan := plan_effectif_commerce(new.commerce_id);
  if v_plan != 'business' then
    raise exception 'Les points de départ multiples nécessitent le Pack Business.';
  end if;

  select count(*) into v_nb from commerce_points_depart where commerce_id = new.commerce_id;
  if v_nb >= 20 then
    raise exception 'Limite de 20 points de départ atteinte.';
  end if;

  return new;
end;
$$;

drop trigger if exists commerce_points_depart_proteger_creation on commerce_points_depart;
create trigger commerce_points_depart_proteger_creation
  before insert on commerce_points_depart
  for each row execute function proteger_creation_commerce_points_depart();

-- =====================================================================
-- Coursiers favoris (Business) — préférence/priorisation uniquement,
-- n'implique aucune garantie d'attribution.
-- =====================================================================

create table if not exists commerce_coursiers_favoris (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commercants (id) on delete cascade,
  coursier_id uuid not null references coursiers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (commerce_id, coursier_id)
);

alter table commerce_coursiers_favoris enable row level security;

drop policy if exists "commerce_coursiers_favoris_all_own_or_admin" on commerce_coursiers_favoris;
create policy "commerce_coursiers_favoris_all_own_or_admin"
  on commerce_coursiers_favoris for all
  using (current_user_type() = 'admin' or commerce_id in (select id from commercants where utilisateur_id = auth.uid()))
  with check (current_user_type() = 'admin' or commerce_id in (select id from commercants where utilisateur_id = auth.uid()));

create or replace function proteger_creation_commerce_coursiers_favoris()
returns trigger
language plpgsql
as $$
begin
  if plan_effectif_commerce(new.commerce_id) != 'business' then
    raise exception 'Les coursiers favoris nécessitent le Pack Business.';
  end if;
  return new;
end;
$$;

drop trigger if exists commerce_coursiers_favoris_proteger_creation on commerce_coursiers_favoris;
create trigger commerce_coursiers_favoris_proteger_creation
  before insert on commerce_coursiers_favoris
  for each row execute function proteger_creation_commerce_coursiers_favoris();

-- =====================================================================
-- courses : rattachement optionnel à un destinataire du carnet / un point
-- de départ (colonnes additives, aucun impact sur le flux existant)
-- =====================================================================

alter table courses add column if not exists destinataire_carnet_id uuid references commerce_destinataires (id);
alter table courses add column if not exists point_depart_id uuid references commerce_points_depart (id);
