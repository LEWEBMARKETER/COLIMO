-- COLIMO TRANSPORT (3/4) : véhicules — table 1-N (un transporteur peut
-- avoir une flotte, décision produit explicite, contrairement au coursier
-- moto qui n'a qu'un seul type_vehicule embarqué dans sa propre ligne).
-- statut_verification est posé PAR VÉHICULE : un transporteur peut avoir
-- certains véhicules validés et d'autres encore en attente.

create table vehicules_transporteur (
  id uuid primary key default gen_random_uuid(),
  transporteur_id uuid not null references transporteurs (id) on delete cascade,
  type_vehicule type_vehicule_transport not null,
  plaque_immatriculation text not null,
  capacite_poids_kg numeric(10, 2),
  capacite_volume_m3 numeric(10, 2),
  documents jsonb not null default '[]'::jsonb,
  statut_verification verification_status not null default 'en_attente',
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vehicules_transporteur_set_updated_at
  before update on vehicules_transporteur
  for each row execute function set_updated_at();

create index vehicules_transporteur_transporteur_idx on vehicules_transporteur (transporteur_id);
create index vehicules_transporteur_statut_verification_idx on vehicules_transporteur (statut_verification);

alter table vehicules_transporteur enable row level security;

-- Pas de colonne utilisateur_id directe sur cette table — la propriété se
-- vérifie par jointure sur transporteurs, même construction que
-- coursiers_select_own_admin_or_client_assigned (0001).
create policy "vehicules_transporteur_select_own_or_admin"
  on vehicules_transporteur for select
  using (
    current_user_type() = 'admin'
    or transporteur_id in (select id from transporteurs where utilisateur_id = auth.uid())
  );

create policy "vehicules_transporteur_insert_own"
  on vehicules_transporteur for insert
  with check (transporteur_id in (select id from transporteurs where utilisateur_id = auth.uid()));

create policy "vehicules_transporteur_update_own_or_admin"
  on vehicules_transporteur for update
  using (
    current_user_type() = 'admin'
    or transporteur_id in (select id from transporteurs where utilisateur_id = auth.uid())
  )
  with check (
    current_user_type() = 'admin'
    or transporteur_id in (select id from transporteurs where utilisateur_id = auth.uid())
  );

-- Même patron de verrouillage que proteger_colonnes_privilegiees_transporteurs
-- (0062) : statut_verification réservé à l'admin.
create function proteger_colonnes_privilegiees_vehicules_transporteur()
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

  return new;
end;
$$;

create trigger vehicules_transporteur_verrouiller_colonnes_privilegiees
  before update on vehicules_transporteur
  for each row execute function proteger_colonnes_privilegiees_vehicules_transporteur();
