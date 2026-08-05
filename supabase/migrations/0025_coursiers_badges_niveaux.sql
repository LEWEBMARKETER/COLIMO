-- Module Coursiers (3/3) : catalogues badges et niveaux, entièrement
-- configurables depuis l'admin (Coursiers → Paramètres) sans déploiement.
-- Aucun seuil n'est codé en dur côté application : les fonctions de calcul
-- (packages/shared/src/coursiers/badges/evaluation.ts,
-- niveaux/calcul.ts) sont pures et reçoivent ces catalogues en paramètre.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'mode_attribution_badge') then
    create type mode_attribution_badge as enum ('automatique', 'manuel');
  end if;
end $$;

create table if not exists catalogue_niveaux (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  nom text not null,
  seuil_livraisons_min integer not null,
  couleur text not null default '#94A3B8',
  icone text,
  ordre integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists catalogue_niveaux_set_updated_at on catalogue_niveaux;
create trigger catalogue_niveaux_set_updated_at
  before update on catalogue_niveaux
  for each row execute function set_updated_at();

create table if not exists catalogue_badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  nom text not null,
  icone text not null,
  description text not null default '',
  couleur text not null default '#C41E24',
  mode_attribution mode_attribution_badge not null default 'automatique',
  regle jsonb not null default '{}'::jsonb,
  actif boolean not null default true,
  ordre_affichage integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists catalogue_badges_set_updated_at on catalogue_badges;
create trigger catalogue_badges_set_updated_at
  before update on catalogue_badges
  for each row execute function set_updated_at();

create table if not exists badges_coursiers (
  id uuid primary key default gen_random_uuid(),
  coursier_id uuid not null references coursiers (id) on delete cascade,
  badge_id uuid not null references catalogue_badges (id) on delete cascade,
  attribue_le timestamptz not null default now(),
  expire_le timestamptz,
  attribue_par uuid references utilisateurs (id),
  retire_le timestamptz,
  retire_par uuid references utilisateurs (id),
  created_at timestamptz not null default now()
);

-- Empêche un même badge d'être actif deux fois pour le même coursier
-- (retire_le is null = actif). Un badge retiré puis ré-attribué crée une
-- nouvelle ligne plutôt que de réutiliser l'ancienne, ce qui préserve
-- l'historique complet des attributions/retraits.
create unique index if not exists badges_coursiers_actif_unique
  on badges_coursiers (coursier_id, badge_id) where retire_le is null;

alter table coursiers add column if not exists niveau_id uuid references catalogue_niveaux (id);

alter table catalogue_niveaux enable row level security;
alter table catalogue_badges enable row level security;
alter table badges_coursiers enable row level security;

drop policy if exists "catalogue_niveaux_select_authenticated" on catalogue_niveaux;
create policy "catalogue_niveaux_select_authenticated"
  on catalogue_niveaux for select
  using (auth.role() = 'authenticated');

drop policy if exists "catalogue_niveaux_all_admin" on catalogue_niveaux;
create policy "catalogue_niveaux_all_admin"
  on catalogue_niveaux for all
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

drop policy if exists "catalogue_badges_select_authenticated" on catalogue_badges;
create policy "catalogue_badges_select_authenticated"
  on catalogue_badges for select
  using (auth.role() = 'authenticated');

drop policy if exists "catalogue_badges_all_admin" on catalogue_badges;
create policy "catalogue_badges_all_admin"
  on catalogue_badges for all
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

-- Les badges sont des signaux de confiance publics (affichés sur la fiche
-- coursier) : lecture ouverte à tout authentifié. Écriture ouverte aussi,
-- car l'attribution automatique peut être déclenchée depuis la session
-- d'un client (ex. après confirmation d'une livraison) — même raisonnement
-- que historique_coursier_insert_authenticated (0024).
drop policy if exists "badges_coursiers_select_authenticated" on badges_coursiers;
create policy "badges_coursiers_select_authenticated"
  on badges_coursiers for select
  using (auth.role() = 'authenticated');

drop policy if exists "badges_coursiers_insert_authenticated" on badges_coursiers;
create policy "badges_coursiers_insert_authenticated"
  on badges_coursiers for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "badges_coursiers_update_authenticated" on badges_coursiers;
create policy "badges_coursiers_update_authenticated"
  on badges_coursiers for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seul point d'entrée pour écrire coursiers.niveau_id (coursiers_update_own_or_admin
-- n'autorise pas une session client à le faire). Utilisée à la fois par le
-- recalcul automatique et par l'action admin "Modifier le niveau". Historise
-- systématiquement le changement.
create or replace function definir_niveau_coursier(
  p_coursier_id uuid,
  p_niveau_id uuid,
  p_administrateur_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ancien_niveau text;
  v_nouveau_niveau text;
begin
  select n.nom into v_ancien_niveau
  from coursiers c left join catalogue_niveaux n on n.id = c.niveau_id
  where c.id = p_coursier_id;

  select nom into v_nouveau_niveau from catalogue_niveaux where id = p_niveau_id;

  if v_ancien_niveau is distinct from v_nouveau_niveau then
    update coursiers set niveau_id = p_niveau_id where id = p_coursier_id;
    insert into historique_coursier (coursier_id, action, ancienne_valeur, nouvelle_valeur, administrateur_id)
    values (p_coursier_id, 'changement_niveau', v_ancien_niveau, v_nouveau_niveau, p_administrateur_id);
  end if;
end;
$$;

insert into catalogue_niveaux (code, nom, seuil_livraisons_min, ordre, couleur) values
  ('debutant', 'Débutant', 0, 1, '#94A3B8'),
  ('bronze', 'Bronze', 50, 2, '#B08D57'),
  ('argent', 'Argent', 200, 3, '#C0C0C0'),
  ('or', 'Or', 500, 4, '#D4AF37'),
  ('platine', 'Platine', 1000, 5, '#8FA8B2'),
  ('diamant', 'Diamant', 3000, 6, '#5DD9E8')
on conflict (code) do nothing;

insert into catalogue_badges (code, nom, icone, description, mode_attribution, regle) values
  ('coursier_verifie', 'Coursier Vérifié', '✅', 'Dossier validé par COLIMO.', 'automatique',
    '{"type":"verification_dossier"}'),
  ('coursier_certifie', 'Coursier Certifié', '🛡️', 'Formation COLIMO complétée.', 'manuel',
    '{"condition":"Formation COLIMO complétée"}'),
  ('premium', 'Premium', '⭐', 'Plus de 200 livraisons, note ≥ 4.8, faible taux d''annulation.', 'automatique',
    '{"type":"seuils_statistiques","nombreLivraisonsMin":200,"noteMoyenneMin":4.8,"tauxAnnulationMax":0.05}'),
  ('livraison_express', 'Livraison Express', '🚀', 'Vitesse de livraison excellente.', 'automatique',
    '{"type":"seuils_statistiques","dureeLivraisonMoyenneMaxSecondes":1200}'),
  ('elite', 'Elite', '💎', 'Les meilleurs coursiers COLIMO.', 'automatique',
    '{"type":"seuils_statistiques","nombreLivraisonsMin":1000,"noteMoyenneMin":4.9,"tauxAnnulationMax":0.02}'),
  ('top_performer', 'Top Performer', '🏆', 'Performance globale exceptionnelle.', 'automatique',
    '{"type":"seuils_statistiques","nombreLivraisonsMin":500,"noteMoyenneMin":4.7}'),
  ('tres_apprecie', 'Très apprécié', '❤️', 'Note moyenne très élevée.', 'automatique',
    '{"type":"seuils_statistiques","noteMoyenneMin":4.9}'),
  ('rapide', 'Rapide', '⏱️', 'Temps de livraison rapide.', 'automatique',
    '{"type":"seuils_statistiques","dureeLivraisonMoyenneMaxSecondes":1500}'),
  ('expert_livraison', 'Expert Livraison', '📦', 'Grand nombre de livraisons réussies.', 'automatique',
    '{"type":"seuils_statistiques","nombreLivraisonsMin":300}'),
  ('fidele', 'Fidèle', '🌟', 'Coursier fidèle à COLIMO depuis longtemps.', 'automatique',
    '{"type":"seuils_statistiques","nombreLivraisonsMin":100}')
on conflict (code) do nothing;
