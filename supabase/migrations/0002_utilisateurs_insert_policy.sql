-- La migration 0001 omettait la policy d'insertion sur `utilisateurs` : sans
-- elle, RLS bloque par défaut toute création de profil après une inscription
-- Supabase Auth (aucune policy = deny all en insertion).

create policy "utilisateurs_insert_own"
  on utilisateurs for insert
  with check (id = auth.uid());
