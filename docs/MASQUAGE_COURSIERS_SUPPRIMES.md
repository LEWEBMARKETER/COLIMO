# Masquer les comptes coursiers supprimés dans le back-office

## Bug corrigé

Un coursier supprimé (anonymisé — nom "Utilisateur supprimé", téléphone
`supprime-<uuid>`) restait affiché normalement sur la liste et la fiche
coursier, avec toutes les actions (Réactiver, Modifier le statut/niveau,
Attribuer un badge, Supprimer définitivement...) toujours disponibles —
donnant l'impression d'un compte actif alors qu'il est banni
définitivement de la connexion.

## Pourquoi pas `statut === "desactive"` (comme pour les clients)

Sur la page Clients, un compte supprimé se détectait simplement via
`statut === "desactive"`, car aucune action manuelle ne produit ce statut
pour un client. **Ce n'est pas vrai pour les coursiers** : `desactive` est
aussi le statut d'une désactivation manuelle normale par un admin
(`desactiverCoursier`, cf. la fonctionnalité de gestion des statuts), sur
un compte parfaitement intact. Utiliser `statut === "desactive"` aurait
donc aussi masqué à tort tous les coursiers simplement désactivés.

Le signal fiable est le **préfixe posé sur le téléphone** par la route de
suppression (`supprime-<uuid>`, jamais utilisé ailleurs) — exposé comme
`estCompteSupprime()` dans `packages/shared/src/comptes/types.ts` et
réutilisé à la fois ici et sur la page Clients (mise à jour au passage
pour plus de cohérence, même si `statut === "desactive"` y était déjà
correct en pratique).

## Ce qui a été fait

- **Liste des coursiers** (`/coursiers`, tous les onglets — dashboard,
  liste, statuts, performances, sélecteur d'historique) : les comptes
  supprimés sont masqués par défaut, avec une case "Afficher les comptes
  supprimés (N)" pour les faire réapparaître au besoin. Le tableau de
  bord (stats, tops) ne compte plus les comptes fantômes. L'historique
  d'audit lui-même reste toujours consultable sans filtre — seule la
  liste de sélection du coursier est filtrée.
- **Fiche coursier** (`/coursiers/[id]`) : pour un compte supprimé, les 4
  cartes d'action (Statut, Niveau, Badge, Commentaire) et le bouton
  "Recalculer badges/niveau" sont remplacés par un bandeau d'information
  ("🗑️ Compte supprimé — aucune action supplémentaire n'est possible..."),
  rappelant que l'historique reste conservé et qu'une réinscription est
  possible 24h après (cf. `docs/REINSCRIPTION_COURSIER_APRES_SUPPRESSION.md`).
  Les statistiques et l'historique restent visibles (audit).
- **Page Clients** : utilise désormais le même helper partagé au lieu de
  `statut === "desactive"` — comportement inchangé en pratique, juste
  unifié avec les coursiers.

## Fichiers modifiés

- `packages/shared/src/comptes/types.ts` (nouveau : `estCompteSupprime`, `PREFIXE_TELEPHONE_COMPTE_SUPPRIME`)
- `apps/admin/app/api/utilisateurs/[id]/route.ts` (réutilise la constante partagée au lieu du literal dupliqué)
- `apps/admin/app/(dashboard)/coursiers/page.tsx`, `coursiers/[id]/page.tsx`, `clients/page.tsx`

## Tests manuels

- [ ] Un coursier supprimé n'apparaît plus dans aucun onglet de `/coursiers` par défaut.
- [ ] Cocher "Afficher les comptes supprimés" : réapparaît, sans aucune action possible dans l'onglet Statuts.
- [ ] Sa fiche affiche le bandeau "Compte supprimé", sans les 4 cartes d'action, mais avec stats/historique conservés.
- [ ] Un coursier simplement désactivé manuellement (pas supprimé) continue d'apparaître normalement, avec toutes ses actions (Réactiver...).
