-- La policy de lecture des coursiers (0001) interroge la table courses, et
-- notre policy de lecture des courses (0012) interrogeait la table
-- coursiers : boucle infinie RLS ("infinite recursion detected in policy
-- for relation coursiers", 42P17), qui cassait toutes les lectures du
-- projet (pas seulement courses).
--
-- Comme pour current_user_type(), on passe par une fonction security
-- definer : son exécution contourne le RLS de coursiers, donc plus de
-- boucle avec la policy de courses.
create or replace function coursier_couvre_zone(cible zone)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select cible = any (zones_couvertes) from coursiers where utilisateur_id = auth.uid();
$$;

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
      and coursier_couvre_zone(zone_depart)
    )
  );

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
      and coursier_couvre_zone(zone_depart)
    )
  )
  with check (client_id = auth.uid() or coursier_id = auth.uid() or current_user_type() = 'admin');
