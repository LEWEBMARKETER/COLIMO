-- COLIMO TRANSPORT (4/4) : bascule d'activation du module — même patron
-- que configuration_recherche_coursier (0057) / configuration_confirmation_livraison
-- (0042). Permet un lancement en pilote (ex. masquer l'entrée du module
-- côté mobile/admin tant que actif = false) sans dépendre d'un déploiement
-- de code pour l'activer. Ne remplace jamais le contrôle RLS posé par les
-- migrations précédentes : une fois actif, l'accès reste strictement
-- gouverné par le rôle 'transporteur' et les policies déjà en place,
-- cette table ne fait que piloter la visibilité de l'UI.

create table configuration_module_transport (
  id int primary key default 1 check (id = 1),
  actif boolean not null default false,
  mis_a_jour_par uuid references utilisateurs (id),
  mis_a_jour_at timestamptz not null default now()
);
insert into configuration_module_transport (id) values (1) on conflict (id) do nothing;

alter table configuration_module_transport enable row level security;

create policy "configuration_module_transport_select_authenticated"
  on configuration_module_transport for select
  to authenticated
  using (true);

create policy "configuration_module_transport_update_admin"
  on configuration_module_transport for update
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');
