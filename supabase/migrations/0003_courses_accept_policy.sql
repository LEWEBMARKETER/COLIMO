-- Corrige la policy UPDATE sur courses : un coursier ne pouvait pas accepter
-- une course non assignée, car la clause USING est évaluée sur la ligne
-- AVANT modification (coursier_id encore null à ce moment).

drop policy "courses_update_client_coursier_or_admin" on courses;

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
      and zone_depart = (select zone from utilisateurs where id = auth.uid())
    )
  )
  with check (client_id = auth.uid() or coursier_id = auth.uid() or current_user_type() = 'admin');
