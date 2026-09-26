-- Corrige un bug latent (préexistant, révélé aujourd'hui par le compte
-- commerce testant le forfait Starter) : aucune policy RLS sur
-- `utilisateurs` ne permettait à un client/commerce de lire le profil
-- (nom, téléphone, photo) d'un coursier qui lui a été assigné. La seule
-- policy select existante (0001, "utilisateurs_select_own_or_admin") ne
-- couvre que sa propre ligne ou un admin.
--
-- Conséquence concrète : tout embed PostgREST `utilisateur:utilisateurs(*)`
-- depuis `coursiers` (getCoursiers, getCoursierAvecUtilisateur) revenait
-- avec utilisateur = null pour un appelant non-admin — et les mappers
-- (utilisateurFromRow) plantaient sur null.id, transformant l'appel en
-- promesse rejetée. Comme statistiques.tsx groupe ses requêtes dans un seul
-- Promise.all, ce rejet empêchait aussi getMonCommerce de renseigner l'état
-- "commerce", qui retombait alors systématiquement sur le forfait "gratuit"
-- par défaut — d'où l'écran verrouillé malgré un abonnement Starter actif.
--
-- Complète, sans le dupliquer, le même principe déjà appliqué à la table
-- `coursiers` elle-même (migration 0001,
-- "coursiers_select_own_admin_or_client_assigned").

drop policy if exists "utilisateurs_select_coursier_assigne_a_client" on utilisateurs;
create policy "utilisateurs_select_coursier_assigne_a_client"
  on utilisateurs for select
  using (
    type = 'coursier'
    and id in (select coursier_id from courses where client_id = auth.uid() and coursier_id is not null)
  );
