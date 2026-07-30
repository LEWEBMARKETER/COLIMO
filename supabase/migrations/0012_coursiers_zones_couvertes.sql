-- Un coursier peut désormais couvrir plusieurs zones (et non une seule,
-- fixée à l'inscription), pour voir en temps réel les demandes de
-- livraison de toutes les zones où il est disponible.
alter table coursiers
  add column if not exists zones_couvertes zone[] not null default '{}';

-- Initialise la couverture des coursiers existants avec leur zone actuelle,
-- pour ne pas leur faire perdre de visibilité au déploiement.
update coursiers c
set zones_couvertes = array[u.zone]
from utilisateurs u
where c.utilisateur_id = u.id
  and u.zone is not null
  and c.zones_couvertes = '{}';

-- Remplace la vérification "zone unique" par une vérification d'appartenance
-- au tableau zones_couvertes du coursier, pour la lecture des courses en
-- attente...
drop policy if exists "courses_select_client_coursier_or_admin" on courses;
create policy "courses_select_client_coursier_or_admin"
  on courses for select
  using (
    client_id = auth.uid()
    or coursier_id = auth.uid()
    or current_user_type() = 'admin'
    or (
      statut = 'en_attente'
      and current_user_type() = 'coursier'
      and zone_depart = any (select zones_couvertes from coursiers where utilisateur_id = auth.uid())
    )
  );

-- ...et pour l'acceptation d'une course (mise à jour statut/coursier_id).
drop policy if exists "courses_update_client_coursier_or_admin" on courses;
create policy "courses_update_client_coursier_or_admin"
  on courses for update
  using (
    client_id = auth.uid()
    or coursier_id = auth.uid()
    or current_user_type() = 'admin'
    or (
      statut = 'en_attente'
      and coursier_id is null
      and current_user_type() = 'coursier'
      and zone_depart = any (select zones_couvertes from coursiers where utilisateur_id = auth.uid())
    )
  )
  with check (client_id = auth.uid() or coursier_id = auth.uid() or current_user_type() = 'admin');
