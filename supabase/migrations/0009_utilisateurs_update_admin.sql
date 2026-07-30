-- Permet à l'admin de modifier (suspendre/réactiver, corriger le profil) le
-- compte de n'importe quel utilisateur. La policy existante
-- "utilisateurs_update_own" reste inchangée (chaque utilisateur peut
-- toujours modifier son propre compte) ; celle-ci s'ajoute en OR.
create policy "utilisateurs_update_admin"
  on utilisateurs for update
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');
