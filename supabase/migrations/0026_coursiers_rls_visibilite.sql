-- Module Coursiers — enforcement v1 (ciblé, faible risque) : un coursier
-- suspendu/désactivé/en attente de validation ne doit plus voir les courses
-- disponibles à accepter. Ne touche qu'à la clause de navigation "coursier
-- cherche une course dans sa zone" de courses_select_client_coursier_or_admin
-- — les clauses client_id/coursier_id/admin, et les policies update/insert
-- (acceptation d'une course), restent strictement inchangées.
--
-- Même raisonnement que coursier_couvre_zone (migration 0013) : interroger
-- la table coursiers depuis une policy sur courses provoquerait une
-- récursion RLS sans passer par une fonction security definer.

create or replace function coursier_est_actif()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select statut in ('verifie', 'en_ligne') from coursiers where utilisateur_id = auth.uid();
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
      and coursier_est_actif()
    )
  );
