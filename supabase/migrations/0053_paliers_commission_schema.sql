-- Système de paliers et commissions coursiers (1/4) : schéma. Grille de
-- commission mensuelle, admin-éditable, effective à compter du 2026-10-01 —
-- voir 0055 pour le moteur de calcul et 0056 pour le branchement sur les
-- chemins de confirmation existants (0042, 0051). Les courses confirmées
-- avant le 2026-10-01 ne sont jamais concernées par ce module (commission
-- historique 15% fixe inchangée, cf. 0017).
--
-- Architecture volontairement proche de catalogue_niveaux/catalogue_badges
-- (0025) : catalogue admin-éditable + RPC security definer + table
-- d'historique append-only. Différence assumée : ce système est mensuel
-- (remise à zéro chaque mois civil), quand catalogue_niveaux est cumulatif
-- à vie — d'où un catalogue et des tables de suivi entièrement séparés,
-- jamais un simple ajout de colonnes à catalogue_niveaux/coursiers.

-- =============================================================================
-- 1. Grille des paliers — plusieurs versions possibles (une par date
--    d'effet), pour qu'un changement futur de grille n'affecte jamais les
--    commissions déjà calculées (chaque ligne de commissions_courses garde
--    la référence de la version utilisée au moment du calcul, cf. 0055).
-- =============================================================================

create table if not exists catalogue_paliers_commission (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  nom text not null,
  seuil_min integer not null check (seuil_min >= 0),
  seuil_max integer check (seuil_max is null or seuil_max >= seuil_min),
  taux numeric(5, 4) not null check (taux >= 0 and taux <= 1),
  ordre integer not null,
  date_effet date not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date_effet, code)
);

create index if not exists catalogue_paliers_commission_date_effet_idx
  on catalogue_paliers_commission (date_effet, ordre);

drop trigger if exists catalogue_paliers_commission_set_updated_at on catalogue_paliers_commission;
create trigger catalogue_paliers_commission_set_updated_at
  before update on catalogue_paliers_commission
  for each row execute function set_updated_at();

alter table catalogue_paliers_commission enable row level security;

-- Lecture ouverte à tout authentifié, comme catalogue_niveaux : les paliers
-- et taux COLIMO ne sont pas une information sensible individuellement.
drop policy if exists "catalogue_paliers_commission_select_authenticated" on catalogue_paliers_commission;
create policy "catalogue_paliers_commission_select_authenticated"
  on catalogue_paliers_commission for select
  using (auth.role() = 'authenticated');

-- Aucune policy d'écriture directe (ni insert, ni update, ni delete) :
-- contrairement à catalogue_niveaux, la validation d'une grille (pas de
-- chevauchement, pas de trou, taux cohérents — besoin section 9) est
-- relationnelle (porte sur l'ensemble des lignes d'une date d'effet, pas
-- une ligne isolée) et ne peut donc pas être une simple contrainte de
-- colonne. Écriture exclusivement via enregistrer_grille_paliers_commission
-- ci-dessous, même pattern que historique_validation_admin_livraison (0051).

-- ---------------------------------------------------------------------------
-- RPC enregistrer_grille_paliers_commission — remplace intégralement la
-- grille d'une date d'effet donnée, après validation complète de
-- l'ensemble proposé. Réservée à l'admin.
-- ---------------------------------------------------------------------------

create or replace function enregistrer_grille_paliers_commission(p_date_effet date, p_paliers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_palier jsonb;
  v_precedent jsonb;
  v_count int;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;

  select jsonb_array_length(p_paliers) into v_count;
  if v_count is null or v_count < 1 then
    raise exception 'La grille doit contenir au moins un palier.';
  end if;

  -- Trie les paliers par seuil_min pour valider la continuité (pas de trou,
  -- pas de chevauchement) dans l'ordre naturel de la grille.
  for v_palier in
    select value from jsonb_array_elements(p_paliers) order by (value ->> 'seuilMin')::int
  loop
    if (v_palier ->> 'seuilMin')::int < 0 then
      raise exception 'Un seuil minimum ne peut pas être négatif.';
    end if;
    if (v_palier ->> 'taux')::numeric < 0 or (v_palier ->> 'taux')::numeric > 1 then
      raise exception 'Un taux de commission doit être compris entre 0 et 1.';
    end if;
    if v_palier ? 'seuilMax' and v_palier -> 'seuilMax' is not null then
      if (v_palier ->> 'seuilMax')::int < (v_palier ->> 'seuilMin')::int then
        raise exception 'Le seuil maximum d''un palier ne peut pas être inférieur à son seuil minimum.';
      end if;
    end if;

    if v_precedent is not null then
      if (v_precedent ->> 'seuilMax') is null then
        raise exception 'Seul le dernier palier (le plus élevé) peut être sans seuil maximum.';
      end if;
      if (v_palier ->> 'seuilMin')::int != (v_precedent ->> 'seuilMax')::int + 1 then
        raise exception 'Chevauchement ou trou détecté entre les paliers (seuils non contigus).';
      end if;
    elsif (v_palier ->> 'seuilMin')::int != 0 then
      raise exception 'Le premier palier doit commencer à 0 course.';
    end if;

    v_precedent := v_palier;
  end loop;

  if (v_precedent ->> 'seuilMax') is not null then
    raise exception 'Le dernier palier (le plus élevé) doit être sans seuil maximum.';
  end if;

  delete from catalogue_paliers_commission where date_effet = p_date_effet;

  insert into catalogue_paliers_commission (code, nom, seuil_min, seuil_max, taux, ordre, date_effet)
  select
    value ->> 'code',
    value ->> 'nom',
    (value ->> 'seuilMin')::int,
    (value ->> 'seuilMax')::int,
    (value ->> 'taux')::numeric,
    (value ->> 'ordre')::int,
    p_date_effet
  from jsonb_array_elements(p_paliers);
end;
$$;

grant execute on function enregistrer_grille_paliers_commission(date, jsonb) to authenticated;

-- Grille initiale, effective au 2026-10-01 (besoin section 1).
insert into catalogue_paliers_commission (code, nom, seuil_min, seuil_max, taux, ordre, date_effet) values
  ('standard', 'Standard', 0, 25, 0.25, 1, '2026-10-01'),
  ('actif', 'Actif', 26, 55, 0.20, 2, '2026-10-01'),
  ('pro', 'Pro', 56, 88, 0.18, 3, '2026-10-01'),
  ('elite', 'Elite', 89, null, 0.15, 4, '2026-10-01')
on conflict (date_effet, code) do nothing;

-- =============================================================================
-- 2. Performance mensuelle par coursier — une ligne par (coursier, mois
--    civil), écrite exclusivement par calculer_et_enregistrer_commission_course
--    (0055). C'est la source du palier courant affiché à l'espace coursier
--    et au back-office (besoin sections 6 et 8).
-- =============================================================================

create table if not exists performance_mensuelle_coursier (
  id uuid primary key default gen_random_uuid(),
  coursier_id uuid not null references coursiers (id) on delete cascade,
  mois date not null,
  courses_eligibles integer not null default 0,
  palier_id uuid references catalogue_paliers_commission (id),
  taux_commission_actuel numeric(5, 4),
  chiffre_affaires_brut numeric not null default 0,
  commission_colimo_total numeric not null default 0,
  revenus_net_coursier numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coursier_id, mois)
);

create index if not exists performance_mensuelle_coursier_mois_idx
  on performance_mensuelle_coursier (mois, coursier_id);

drop trigger if exists performance_mensuelle_coursier_set_updated_at on performance_mensuelle_coursier;
create trigger performance_mensuelle_coursier_set_updated_at
  before update on performance_mensuelle_coursier
  for each row execute function set_updated_at();

alter table performance_mensuelle_coursier enable row level security;

drop policy if exists "performance_mensuelle_coursier_select_own_or_admin" on performance_mensuelle_coursier;
create policy "performance_mensuelle_coursier_select_own_or_admin"
  on performance_mensuelle_coursier for select
  using (
    current_user_type() = 'admin'
    or exists (select 1 from coursiers c where c.id = coursier_id and c.utilisateur_id = auth.uid())
  );

-- Aucune policy d'écriture : uniquement mise à jour par
-- calculer_et_enregistrer_commission_course (security definer, 0055), qui
-- contourne RLS par nature — un coursier ne doit jamais pouvoir modifier
-- son propre compteur de courses ou son palier (besoin section 11).

-- =============================================================================
-- 3. Historique des franchissements de palier — une ligne par changement de
--    palier dans le mois (besoin section 5 : "date d'atteinte de chaque
--    palier"), append-only.
-- =============================================================================

create table if not exists historique_palier_coursier (
  id uuid primary key default gen_random_uuid(),
  coursier_id uuid not null references coursiers (id) on delete cascade,
  mois date not null,
  palier_id uuid not null references catalogue_paliers_commission (id),
  atteint_le timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists historique_palier_coursier_coursier_idx
  on historique_palier_coursier (coursier_id, mois, atteint_le desc);

alter table historique_palier_coursier enable row level security;

drop policy if exists "historique_palier_coursier_select_own_or_admin" on historique_palier_coursier;
create policy "historique_palier_coursier_select_own_or_admin"
  on historique_palier_coursier for select
  using (
    current_user_type() = 'admin'
    or exists (select 1 from coursiers c where c.id = coursier_id and c.utilisateur_id = auth.uid())
  );

-- =============================================================================
-- 4. Commission par course — snapshot définitif, jamais retouché après
--    écriture (besoin section 4 et 10). unique(course_id) est le garde-fou
--    empêchant qu'une même course génère deux commissions.
-- =============================================================================

create table if not exists commissions_courses (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references courses (id) on delete cascade,
  coursier_id uuid not null references coursiers (id),
  montant_brut numeric not null,
  taux_commission numeric(5, 4) not null,
  montant_commission numeric not null,
  montant_net_coursier numeric not null,
  -- null = course confirmée avant le 2026-10-01 (commission historique
  -- 15% fixe, hors système de paliers, besoin section 14).
  palier_id uuid references catalogue_paliers_commission (id),
  calcule_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists commissions_courses_coursier_idx
  on commissions_courses (coursier_id, calcule_at desc);

alter table commissions_courses enable row level security;

drop policy if exists "commissions_courses_select_own_or_admin" on commissions_courses;
create policy "commissions_courses_select_own_or_admin"
  on commissions_courses for select
  using (
    current_user_type() = 'admin'
    or exists (select 1 from coursiers c where c.id = coursier_id and c.utilisateur_id = auth.uid())
  );

-- =============================================================================
-- 5. Boîte aux lettres interne franchissement -> notification. La fonction
--    de calcul (0055, appelée depuis confirmer_reception_client /
--    valider_livraison_admin / finaliser_livraisons_en_attente, 0056) tourne
--    en SQL pur et ne peut pas appeler notifierEvenement (TypeScript,
--    Communication Center) directement. Les wrappers TS de ces trois
--    fonctions consomment cette table juste après l'appel RPC existant —
--    aucune logique de notification dupliquée, seulement un nouveau point
--    d'appel au système déjà en place (cf. docs/COMMUNICATION_CENTER.md).
-- =============================================================================

create table if not exists notifications_palier_en_attente (
  id uuid primary key default gen_random_uuid(),
  coursier_id uuid not null references coursiers (id) on delete cascade,
  palier_id uuid not null references catalogue_paliers_commission (id),
  cree_at timestamptz not null default now(),
  traite_at timestamptz
);

create index if not exists notifications_palier_en_attente_coursier_idx
  on notifications_palier_en_attente (coursier_id) where traite_at is null;

-- Table strictement interne (aucune policy = accès refusé à toute requête
-- directe authenticated/anon) : consommée uniquement via
-- recuperer_et_marquer_notification_palier (security definer, 0055).
alter table notifications_palier_en_attente enable row level security;
