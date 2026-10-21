-- COLIMO TRANSPORT (2/4) : table transporteurs — miroir de coursiers
-- (0001_init_schema.sql), même patron de vérification/sécurité :
--   - statut_verification (verification_status, réutilisé tel quel)
--   - documents jsonb pour les justificatifs "société" (registre de
--     commerce, assurance société...) — les documents par véhicule vivent
--     dans vehicules_transporteur (0063), pas ici
--   - zones_couvertes zone[] : réutilise l'enum zone existant tel quel
--     (décision produit : le module reste sur les 6 zones actuelles,
--     aucun nouveau modèle géographique)
--   - historique_transporteur : audit append-only, même forme que
--     historique_coursier (0024)
-- Aucune colonne, aucune policy, aucun trigger existant n'est touché.

create type type_vehicule_transport as enum ('camionnette', 'camion', 'fourgon', 'pickup', 'remorque', 'autre');

create table transporteurs (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null unique references utilisateurs (id) on delete cascade,
  nom_entreprise text,
  documents jsonb not null default '[]'::jsonb,
  type_piece_identite piece_identite_type,
  piece_identite_url text,
  zones_couvertes zone[] not null default '{}',
  statut_verification verification_status not null default 'en_attente',
  note_moyenne numeric(2, 1) not null default 0 check (note_moyenne >= 0 and note_moyenne <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger transporteurs_set_updated_at
  before update on transporteurs
  for each row execute function set_updated_at();

create index transporteurs_statut_verification_idx on transporteurs (statut_verification);

alter table transporteurs enable row level security;

create policy "transporteurs_select_own_or_admin"
  on transporteurs for select
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin');

create policy "transporteurs_update_own_or_admin"
  on transporteurs for update
  using (utilisateur_id = auth.uid() or current_user_type() = 'admin')
  with check (utilisateur_id = auth.uid() or current_user_type() = 'admin');

create policy "transporteurs_insert_own"
  on transporteurs for insert
  with check (utilisateur_id = auth.uid());

-- Verrouillage de colonnes privilégiées — même patron que
-- proteger_colonnes_privilegiees_coursiers (0028) : statut_verification
-- n'est modifiable que par un admin (ou le système, hors session). Pas de
-- protection additionnelle nécessaire ici (pas de niveau/badge/compteurs à
-- ce stade du module, contrairement aux coursiers).
create function proteger_colonnes_privilegiees_transporteurs()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  if new.statut_verification is distinct from old.statut_verification then
    new.statut_verification := old.statut_verification;
  end if;
  if new.note_moyenne is distinct from old.note_moyenne then
    new.note_moyenne := old.note_moyenne;
  end if;

  return new;
end;
$$;

create trigger transporteurs_verrouiller_colonnes_privilegiees
  before update on transporteurs
  for each row execute function proteger_colonnes_privilegiees_transporteurs();

-- Historique d'audit — même forme que historique_coursier (0024).
create type action_historique_transporteur as enum (
  'validation_dossier',
  'rejet_dossier',
  'suspension',
  'reactivation',
  'commentaire_interne'
);

create table historique_transporteur (
  id uuid primary key default gen_random_uuid(),
  transporteur_id uuid not null references transporteurs (id) on delete cascade,
  action action_historique_transporteur not null,
  ancienne_valeur text,
  nouvelle_valeur text,
  motif text,
  commentaire text,
  administrateur_id uuid references utilisateurs (id),
  created_at timestamptz not null default now()
);

create index historique_transporteur_transporteur_idx on historique_transporteur (transporteur_id, created_at desc);

alter table historique_transporteur enable row level security;

-- Lecture réservée à l'admin (motifs/commentaires internes jamais exposés
-- au transporteur lui-même, même règle que historique_coursier).
create policy "historique_transporteur_select_admin"
  on historique_transporteur for select
  using (current_user_type() = 'admin');

create policy "historique_transporteur_insert_admin"
  on historique_transporteur for insert
  with check (current_user_type() = 'admin');
