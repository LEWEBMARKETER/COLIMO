-- Géolocalisation temps réel des coursiers (Mapbox + Supabase Realtime).
--
-- Principes retenus :
--   - La position n'est transmise que pendant une course active (acceptee/
--     retrait/en_cours) : le tracking démarre et s'arrête côté app coursier
--     selon le statut de sa course en cours (voir apps/mobile), et cette
--     table ne conserve qu'UNE ligne par coursier (position courante, pas
--     un historique) — hors course active, la ligne est simplement absente
--     ou périmée, jamais mise à jour.
--   - Le calcul distance/ETA (Mapbox Directions, payant) est fait côté
--     serveur (fonction Vercel avec clé secrète) et son résultat est mis en
--     cache sur `courses` : le client ne déclenche un recalcul que lorsque
--     c'est pertinent (throttle temps + déplacement), jamais à chaque
--     position GPS.
--   - Le destinataire (sans compte) garde son accès en lecture seule via
--     `get_course_suivi_public`, désormais identifiée par un code court
--     lisible plutôt que l'uuid `token_suivi` (conservé tel quel, non
--     utilisé par ce nouveau code) et enrichie de la position/ETA.

-- =============================================================================
-- 1. Position courante des coursiers (une ligne par coursier, écrasée à
--    chaque mise à jour — pas un historique de trajet).
-- =============================================================================

create table if not exists positions_coursiers (
  coursier_id uuid primary key references utilisateurs (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  precision_m double precision,
  vitesse_kmh double precision,
  cap_degres double precision,
  maj_at timestamptz not null default now()
);

alter table positions_coursiers enable row level security;

create policy "positions_coursiers_insert_own"
  on positions_coursiers for insert
  with check (coursier_id = auth.uid());

create policy "positions_coursiers_update_own"
  on positions_coursiers for update
  using (coursier_id = auth.uid())
  with check (coursier_id = auth.uid());

-- Visible par le coursier lui-même, un admin, et le client d'une course
-- actuellement active qui lui est assignée — jamais après la fin de la
-- course, jamais à un client sans course en cours avec lui.
create policy "positions_coursiers_select_own_admin_ou_client_actif"
  on positions_coursiers for select
  using (
    coursier_id = auth.uid()
    or current_user_type() = 'admin'
    or exists (
      select 1 from courses
      where courses.coursier_id = positions_coursiers.coursier_id
        and courses.client_id = auth.uid()
        and courses.statut in ('acceptee', 'retrait', 'en_cours')
    )
  );

alter publication supabase_realtime add table positions_coursiers;

-- =============================================================================
-- 2. Code de suivi public court et lisible (ex. CLM-X7P4-K92M), en
--    remplacement du jeton uuid pour le lien envoyé au destinataire —
--    token_suivi (0037) reste en base mais n'est plus utilisé par
--    l'application au-delà de cette migration.
-- =============================================================================

create or replace function generer_code_suivi_unique()
returns text
language plpgsql
as $$
declare
  -- Alphabet sans 0/O/1/I/L (ambigus à l'oral/à l'écran).
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text;
  tentative int := 0;
begin
  loop
    code := 'CLM-'
      || (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') from generate_series(1, 4))
      || '-'
      || (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') from generate_series(1, 4));
    exit when not exists (select 1 from courses where code_suivi = code);
    tentative := tentative + 1;
    if tentative > 20 then
      raise exception 'Impossible de générer un code de suivi unique après % tentatives', tentative;
    end if;
  end loop;
  return code;
end;
$$;

alter table courses add column if not exists code_suivi text unique;

-- Backfill explicite ligne par ligne plutôt qu'un DEFAULT évalué en une
-- seule passe de réécriture de table : chaque UPDATE ci-dessous est visible
-- par les suivants (même transaction), ce qui garantit que la vérification
-- d'unicité dans generer_code_suivi_unique() voit bien les codes déjà
-- attribués aux lignes précédentes — une contrainte UNIQUE seule ne suffit
-- pas à le garantir si tout était évalué en une seule passe.
do $$
declare
  r record;
begin
  for r in select id from courses where code_suivi is null loop
    update courses set code_suivi = generer_code_suivi_unique() where id = r.id;
  end loop;
end $$;

alter table courses alter column code_suivi set not null;
alter table courses alter column code_suivi set default generer_code_suivi_unique();

-- =============================================================================
-- 3. Distance restante / ETA mis en cache sur la course (recalculés par la
--    fonction serveur Mapbox, jamais directement par le client — voir la
--    section 6 sur le verrouillage de colonnes).
-- =============================================================================

alter table courses add column if not exists distance_restante_m double precision;
alter table courses add column if not exists eta_secondes integer;
alter table courses add column if not exists eta_calcule_at timestamptz;
alter table courses add column if not exists eta_calcule_lat double precision;
alter table courses add column if not exists eta_calcule_lng double precision;
alter table courses add column if not exists eta_source text;

-- =============================================================================
-- 4. Cache de géocodage Mapbox — évite de repayer un appel API pour une
--    adresse déjà résolue. Aucune policy : lecture/écriture réservées à la
--    fonction serveur (clé service role, qui contourne RLS) ; un accès
--    direct via clé anon/authenticated est donc toujours refusé.
-- =============================================================================

create table if not exists geocodages_cache (
  id uuid primary key default gen_random_uuid(),
  requete text not null unique,
  latitude double precision not null,
  longitude double precision not null,
  adresse_formatee text,
  created_at timestamptz not null default now()
);

alter table geocodages_cache enable row level security;

-- =============================================================================
-- 5. Compteur d'utilisation Mapbox, pour suivre le volume d'appels
--    (Directions/Geocoding) par jour et détecter une dérive de coût.
-- =============================================================================

create table if not exists mapbox_usage (
  type text not null,
  jour date not null default current_date,
  nombre_appels integer not null default 0,
  primary key (type, jour)
);

alter table mapbox_usage enable row level security;

create policy "mapbox_usage_select_admin"
  on mapbox_usage for select
  using (current_user_type() = 'admin');

create or replace function incrementer_usage_mapbox(p_type text, p_delta integer default 1)
returns void
language sql
as $$
  insert into mapbox_usage (type, jour, nombre_appels)
  values (p_type, current_date, p_delta)
  on conflict (type, jour) do update set nombre_appels = mapbox_usage.nombre_appels + excluded.nombre_appels;
$$;

-- =============================================================================
-- 6. Verrouillage des nouvelles colonnes ETA/distance : comme prix/coursier_id
--    (0028), elles ne doivent être modifiables que par la fonction serveur
--    (clé service role -> auth.uid() est alors null) ou un admin, jamais
--    directement par le client ou le coursier via l'API REST.
-- =============================================================================

create or replace function proteger_colonnes_privilegiees_courses()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  if new.prix is distinct from old.prix then
    new.prix := old.prix;
  end if;
  if new.reduction_promo is distinct from old.reduction_promo then
    new.reduction_promo := old.reduction_promo;
  end if;
  if new.frais_retour is distinct from old.frais_retour then
    new.frais_retour := old.frais_retour;
  end if;

  if new.coursier_id is distinct from old.coursier_id then
    if not (old.coursier_id is null and new.coursier_id = auth.uid()) then
      new.coursier_id := old.coursier_id;
    end if;
  end if;

  if new.distance_restante_m is distinct from old.distance_restante_m then
    new.distance_restante_m := old.distance_restante_m;
  end if;
  if new.eta_secondes is distinct from old.eta_secondes then
    new.eta_secondes := old.eta_secondes;
  end if;
  if new.eta_calcule_at is distinct from old.eta_calcule_at then
    new.eta_calcule_at := old.eta_calcule_at;
  end if;
  if new.eta_calcule_lat is distinct from old.eta_calcule_lat then
    new.eta_calcule_lat := old.eta_calcule_lat;
  end if;
  if new.eta_calcule_lng is distinct from old.eta_calcule_lng then
    new.eta_calcule_lng := old.eta_calcule_lng;
  end if;
  if new.eta_source is distinct from old.eta_source then
    new.eta_source := old.eta_source;
  end if;

  return new;
end;
$$;

-- Le trigger existant (0028) est déjà nommé courses_proteger_colonnes ;
-- create or replace ci-dessus suffit à mettre à jour son comportement.

-- =============================================================================
-- 7. get_course_suivi_public : identifiée par le nouveau code court, et
--    enrichie de la position du coursier (uniquement pendant une course
--    active) et de l'ETA/distance en cache.
-- =============================================================================

drop function if exists get_course_suivi_public(uuid);

create or replace function get_course_suivi_public(p_code text)
returns table (
  id uuid,
  numero_commande text,
  statut course_status,
  type_colis text,
  categorie_colis categorie_colis,
  adresse_depart text,
  adresse_arrivee text,
  repere_depart text,
  repere_arrivee text,
  latitude_depart double precision,
  longitude_depart double precision,
  latitude_arrivee double precision,
  longitude_arrivee double precision,
  nom_expediteur text,
  telephone_expediteur text,
  nom_destinataire text,
  telephone_destinataire text,
  instructions text,
  programmee_pour timestamptz,
  coursier_id uuid,
  coursier_nom text,
  coursier_prenom text,
  coursier_telephone text,
  coursier_note numeric,
  coursier_latitude double precision,
  coursier_longitude double precision,
  coursier_position_maj_at timestamptz,
  distance_restante_m double precision,
  eta_secondes integer,
  acceptee_at timestamptz,
  recuperee_at timestamptz,
  livree_at timestamptz,
  confirmee_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.numero_commande,
    c.statut,
    c.type_colis,
    c.categorie_colis,
    c.adresse_depart,
    c.adresse_arrivee,
    c.repere_depart,
    c.repere_arrivee,
    c.latitude_depart,
    c.longitude_depart,
    c.latitude_arrivee,
    c.longitude_arrivee,
    c.nom_expediteur,
    c.telephone_expediteur,
    c.nom_destinataire,
    c.telephone_destinataire,
    c.instructions,
    c.programmee_pour,
    c.coursier_id,
    u.nom,
    u.prenom,
    u.telephone,
    co.note_moyenne,
    case when c.statut in ('acceptee', 'retrait', 'en_cours') then p.latitude else null end,
    case when c.statut in ('acceptee', 'retrait', 'en_cours') then p.longitude else null end,
    case when c.statut in ('acceptee', 'retrait', 'en_cours') then p.maj_at else null end,
    c.distance_restante_m,
    c.eta_secondes,
    c.acceptee_at,
    c.recuperee_at,
    c.livree_at,
    c.confirmee_at,
    c.created_at
  from courses c
  left join utilisateurs u on u.id = c.coursier_id
  left join coursiers co on co.utilisateur_id = c.coursier_id
  left join positions_coursiers p on p.coursier_id = c.coursier_id
  where c.code_suivi = p_code;
$$;

grant execute on function get_course_suivi_public(text) to anon, authenticated;
