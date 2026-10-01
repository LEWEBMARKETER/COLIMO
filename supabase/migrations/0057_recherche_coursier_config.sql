-- Recherche d'un coursier — délai d'attente (1/4) : configuration
-- centrale, même patron que configuration_confirmation_livraison (0042) —
-- une bascule unique, éditable en admin, jamais de valeur codée en dur
-- dans le frontend. delai_recherche_minutes pilote le compteur affiché au
-- client (track/[id].tsx) ; intervalles_relance_minutes pilote les
-- relances coursiers (0060).

create table if not exists configuration_recherche_coursier (
  id int primary key default 1 check (id = 1),
  delai_recherche_minutes int not null default 15 check (delai_recherche_minutes > 0),
  intervalles_relance_minutes int[] not null default '{5,10}',
  mis_a_jour_par uuid references utilisateurs (id),
  mis_a_jour_at timestamptz not null default now()
);
insert into configuration_recherche_coursier (id) values (1) on conflict (id) do nothing;

alter table configuration_recherche_coursier enable row level security;

drop policy if exists "configuration_recherche_coursier_select_authenticated" on configuration_recherche_coursier;
create policy "configuration_recherche_coursier_select_authenticated"
  on configuration_recherche_coursier for select
  to authenticated
  using (true);

drop policy if exists "configuration_recherche_coursier_update_admin" on configuration_recherche_coursier;
create policy "configuration_recherche_coursier_update_admin"
  on configuration_recherche_coursier for update
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');
