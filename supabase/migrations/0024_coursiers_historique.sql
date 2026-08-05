-- Module Coursiers (2/3) : historique d'audit. Toute action admin (ou
-- automatique) sur un coursier — changement de statut, badge, niveau,
-- commentaire interne — passe par cette table. Créée avant les tables de
-- badges/niveaux (0025) car definir_niveau_coursier() y insère une ligne.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'action_historique_coursier') then
    create type action_historique_coursier as enum (
      'changement_statut',
      'attribution_badge',
      'retrait_badge',
      'changement_niveau',
      'commentaire_interne',
      'validation_dossier',
      'rejet_dossier',
      'suspension',
      'reactivation',
      'desactivation'
    );
  end if;
end $$;

create table if not exists historique_coursier (
  id uuid primary key default gen_random_uuid(),
  coursier_id uuid not null references coursiers (id) on delete cascade,
  action action_historique_coursier not null,
  ancienne_valeur text,
  nouvelle_valeur text,
  motif text,
  commentaire text,
  administrateur_id uuid references utilisateurs (id),
  created_at timestamptz not null default now()
);

create index if not exists historique_coursier_coursier_idx on historique_coursier (coursier_id, created_at desc);

alter table historique_coursier enable row level security;

-- Lecture réservée à l'admin : contient des commentaires internes et des
-- motifs de suspension, jamais exposés au coursier lui-même.
drop policy if exists "historique_coursier_select_admin" on historique_coursier;
create policy "historique_coursier_select_admin"
  on historique_coursier for select
  using (current_user_type() = 'admin');

-- Insertion ouverte à tout authentifié : le recalcul automatique (badges/
-- niveau) peut être déclenché depuis la session du client (confirmation de
-- livraison) ou du coursier (notation), pas seulement par un admin. Aucune
-- fuite d'info puisque la lecture reste verrouillée ci-dessus.
drop policy if exists "historique_coursier_insert_authenticated" on historique_coursier;
create policy "historique_coursier_insert_authenticated"
  on historique_coursier for insert
  with check (auth.role() = 'authenticated');
