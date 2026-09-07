# Gestion complète du statut des coursiers (back-office admin)

## Audit préalable — ce qui existait déjà

Avant tout code, audit de l'existant (cf. session) : la quasi-totalité de
ce qui était demandé était déjà en place, construite lors des migrations
0023-0025 (module Coursiers) :

- `coursiers.statut` est déjà LE champ canonique du statut opérationnel
  (`en_attente_validation | verifie | en_ligne | hors_ligne | suspendu | desactive`),
  avec un trigger de synchronisation (`coursiers_sync_statut`, 0023) qui
  coupe automatiquement `disponibilite` dès que le statut passe à
  `suspendu`/`desactive`/`hors_ligne`.
- `historique_coursier` (0024) journalise déjà tout changement de statut
  (`changement_statut`, `suspension`, `reactivation`, `desactivation`),
  avec motif/commentaire/administrateur — c'est déjà l'historique d'action
  admin demandé, rien à recréer.
- `packages/shared/src/coursiers/statuts/index.ts` expose déjà
  `suspendreCoursier`, `desactiverCoursier`, `reactiverCoursier`,
  `changerStatutCoursier`, chacune journalisant automatiquement dans
  `historique_coursier`.
- L'admin a déjà pleine écriture RLS sur `coursiers` (`coursiers_update_own_or_admin`,
  0001) et les colonnes privilégiées (statut, notes, compteurs...) sont
  déjà verrouillées pour tout non-admin (0028).
- `apps/admin/app/(dashboard)/coursiers/page.tsx` (onglet "Statuts") et
  `coursiers/[id]/page.tsx` (fiche) exposaient déjà Suspendre/Désactiver/
  Réactiver, avec motif obligatoire à la suspension et confirmation à la
  désactivation.
- `apps/admin/app/api/utilisateurs/[id]/route.ts` gère déjà, pour **tout**
  type de compte (client/coursier/commerçant), la logique "tenter une
  suppression réelle (Supabase Auth + cascade), sinon basculer sur une
  anonymisation + bannissement permanent" — exactement le comportement
  demandé (conserver l'historique si le compte en a, sinon supprimer pour
  de bon). La suppression Auth ne s'effectue que côté serveur (clé
  service-role), jamais depuis le frontend — déjà conforme.
- La fiche coursier avait déjà un bouton "Supprimer" dans la liste, mais
  **pas** sur sa propre page dédiée — ajouté ici.

## Ce qui manquait réellement (l'objet de cette fonctionnalité)

1. **Aucun garde-fou n'empêchait de suspendre/désactiver/supprimer un
   coursier ayant une course active** (`acceptee`/`retrait`/`en_cours`).
   Ajouté au niveau base — `supabase/migrations/0043_gestion_statut_coursiers_admin.sql` —
   via un trigger `BEFORE UPDATE ON coursiers` qui bloque toute
   transition vers `suspendu`/`desactive` s'il existe une telle course,
   **y compris pour un admin** (aucune session n'est exemptée, contrairement
   au verrouillage de colonnes de 0028 qui laisse l'admin tout modifier).
   Valable pour tout appel — UI admin ou appel REST direct.
2. Le repli "anonymisation" de la route de suppression de compte ne
   mettait à jour que `documents`/`piece_identite_url` sur `coursiers` —
   **jamais `coursiers.statut`**. Un coursier anonymisé (banni de
   Supabase Auth) pouvait donc rester `en_ligne` en base et continuer à
   apparaître disponible pour l'attribution automatique, alors qu'il ne
   peut plus jamais se reconnecter. Corrigé : l'anonymisation d'un compte
   coursier force désormais `statut = 'desactive'` (ce qui coupe aussi
   `disponibilite` via le trigger existant 0023) et journalise l'action
   dans `historique_coursier`.
3. La route de suppression vérifie maintenant, **avant toute tentative**,
   si le coursier ciblé a une course active — et refuse immédiatement
   (409) avec un message clair plutôt que de risquer un bannissement en
   pleine livraison.
4. `getCoursiersAvecStatutEffectif` (déjà utilisé par la liste admin)
   expose maintenant aussi le booléen brut `aCourseEnCours` (pas seulement
   `statutEffectif === "occupe"`, qui ne se déclenche que depuis
   `en_ligne` — un coursier passé `hors_ligne` en cours de course restait
   invisible à ce test). Utilisé côté UI pour désactiver visuellement les
   boutons Suspendre/Désactiver/Supprimer et éviter l'aller-retour serveur
   inutile — la vraie protection reste le trigger côté base.
5. Ajout du bouton **🗑️ Supprimer définitivement** sur la fiche coursier
   dédiée (`coursiers/[id]/page.tsx`), qui n'existait que dans la liste —
   même confirmation, même route serveur, aucune duplication de logique.
6. Icônes ajoutées aux actions existantes (👁️ Voir, ✏️ Modifier, ⏸️ Suspendre,
   🚫 Désactiver, ♻️ Réactiver, 🗑️ Supprimer) et alignement du texte de
   confirmation de suppression sur la formulation demandée ("Supprimer
   définitivement ce coursier ? Cette action est irréversible.").

## Ce qui n'a pas été touché (déjà conforme)

- **Connexion bloquée dès désactivation** : `apps/mobile/lib/AuthContext.tsx`
  déconnectait déjà immédiatement tout coursier dont `statut === "desactive"`
  à chaque chargement de session — inchangé.
- **Plus aucune course reçue / plus visible comme disponible** :
  `attribution_intelligente` (0039) ne considère déjà que les coursiers
  `statut = 'en_ligne' AND disponibilite = true` — un coursier suspendu ou
  désactivé (`disponibilite` coupée automatiquement par 0023) était déjà
  exclu de toute attribution. Rien à modifier.
- **Historique conservé** : courses, paiements, commissions, notations
  restent intacts quel que soit le statut du coursier — ni la suspension
  ni la désactivation ne touchent à ces tables.
- **Permissions** : seul un compte `type = 'admin'` peut écrire
  `coursiers.statut` (RLS + trigger 0028) ou appeler la route de
  suppression (vérifié explicitement dans `route.ts`) — inchangé.

## Fichiers modifiés/ajoutés

**Nouveau** : `supabase/migrations/0043_gestion_statut_coursiers_admin.sql`

**Modifiés** :
- `packages/shared/src/coursiers/statuts/index.ts` (expose `aCourseEnCours`)
- `apps/admin/app/api/utilisateurs/[id]/route.ts` (garde-fou course active + correction anonymisation coursier)
- `apps/admin/app/(dashboard)/coursiers/page.tsx` (désactivation visuelle des actions, messages d'erreur, icônes)
- `apps/admin/app/(dashboard)/coursiers/[id]/page.tsx` (bouton Supprimer manquant, garde-fou, bannière d'avertissement, icônes)

## Migration à appliquer

`supabase/migrations/0043_gestion_statut_coursiers_admin.sql` (SQL Editor Supabase, après 0042).

## Tests manuels

- [ ] Suspendre un coursier sans course active : historique + connexion coupée pour recevoir de nouvelles courses (déjà géré par 0023/attribution).
- [ ] Désactiver un coursier : il ne peut plus se connecter (`AuthContext`), il n'apparaît plus disponible.
- [ ] Réactiver un coursier suspendu/désactivé : redevient `hors_ligne`, doit repasser `disponible` manuellement.
- [ ] Assigner une course à un coursier (`acceptee`), tenter de le suspendre/désactiver/supprimer depuis la liste et depuis la fiche : bloqué avec message clair, aucune action effectuée.
- [ ] Terminer/réaffecter cette course, réessayer : l'action réussit.
- [ ] Supprimer un coursier sans aucun historique : suppression réelle (Auth + ligne coursiers/utilisateurs).
- [ ] Supprimer un coursier avec historique (courses/paiements/avis) : anonymisation + bannissement, `coursiers.statut` passe à `desactive`, ligne ajoutée à `historique_coursier`, historique de courses/paiements conservé.
- [ ] Vérifier que seul un compte admin peut effectuer ces actions (RLS + route serveur).
