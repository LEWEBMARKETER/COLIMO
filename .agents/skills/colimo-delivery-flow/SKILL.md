---
name: colimo-delivery-flow
description: >
  Architecture du cycle de vie d'une course COLIMO (statuts, transitions,
  historisation, notifications). Utiliser avant de toucher au statut d'une
  course, d'ajouter un workflow de livraison (échec, litige, annulation,
  validation), ou de déclencher une communication liée à une course.
---

# Delivery Flow — COLIMO

## Les statuts existants suffisent presque toujours

`course_status` (enum Postgres, `packages/shared/src/types/index.ts`) :

```
en_attente_paiement → en_attente → acceptee → retrait → en_cours
  → livree → confirmee
             ↘ annulee / litige / retournee / echouee
```

Avant d'ajouter un nouveau statut pour représenter un besoin métier,
vérifier qu'il ne correspond pas déjà à un statut existant sous un autre
nom. Exemple vécu (besoin « Validation administrative finale d'une
course ») : le besoin décrivait un statut « Livraison à confirmer » —
c'est exactement le statut existant `livree` (coursier a remis le colis,
en attente de confirmation), pas un nouveau statut à créer. « Livraison
confirmée / Course clôturée » est `confirmee`. Le cas « contesté » est
`litige`, déjà pourvu d'un système de traitement complet.

**Règle** : ne jamais ajouter de valeur à `course_status` pour un cas qui
peut se modéliser comme (a) une nuance/sous-décision d'un statut existant,
journalisée dans une table dédiée, ou (b) une réutilisation d'un statut
terminal existant (`litige` pour tout ce qui nécessite un arbitrage,
`confirmee`/`annulee`/`retournee` pour toute clôture).

## Le patron « décision + historique dédié »

Un workflow qui ajoute une décision humaine sur une course (motif, résultat,
note) se modélise par **une table dédiée `historique_<nom>_<livraison>`**,
jamais par un statut supplémentaire ni par une colonne générique
"détails" surchargée. Précédents à suivre :

- `historique_echecs_livraison` (motif obligatoire, décision
  nouvelle_tentative/retour) — échec de remise par le coursier.
- `historique_confirmation_livraison` (événements typés OTP/photo/confirmation).
- `historique_validation_admin_livraison` (méthode de vérification, résultat,
  note, source) — validation de secours par un admin.

Chaque table de ce type : colonnes typées explicites (jamais un `jsonb`
fourre-tout pour des champs qu'on sait à l'avance), `course_id` en FK,
append-only (aucune policy `update`), RLS restreinte aux parties
concernées (ou admin uniquement si l'information doit « rester interne au
back-office », précédent : `historique_validation_admin_livraison`).

## Toute transition privilégiée passe par une RPC `security definer`

Jamais de `patchCourse` direct pour un changement de statut sensible. La
RPC doit, dans cet ordre : vérifier le rôle/l'appartenance de l'appelant,
valider le statut courant de la course (raise exception si incompatible),
appliquer la transition, puis `perform set_config('colimo.systeme_interne',
'true', true)` **avant** l'`update` — les triggers `proteger_transition_livree_courses`
et `proteger_colonnes_privilegiees_courses` laissent passer un `update`
uniquement si ce flag est posé ou si l'appelant est admin. Toujours
terminer par un `insert` dans la table d'historique dédiée. Précédents :
`declarer_echec_livraison`, `traiter_echec_livraison`, `valider_livraison_admin`,
`resoudre_litige`.

## Affichage : réutiliser les composants existants

`StatusTimeline` (mobile) et `BandeauStatut` (mobile) sont les **seuls**
composants de statut de course — ils dérivent leur libellé et leur couleur
de `COURSE_STATUS_LABELS`/`TEINTES_STATUT` (voir `colimo-design-system`).
Ne pas construire un affichage de statut parallèle. `StatusTimeline`
calcule déjà une durée écoulée ; si un statut manque d'indicateur de temps
utile (ex. recherche de coursier en cours), étendre son calcul plutôt que
créer un composant séparé.

## Notifications : toujours via le Communication Center

Ne jamais appeler un fournisseur (SMS/email/WhatsApp/push) directement, ni
écrire dans la table `notifications` à la main. Point d'entrée unique :
`communication.send()` (`packages/shared/src/communication/service.ts`) ou
le wrapper `notifierEvenement()` (`apps/mobile/lib/communication.ts`,
`apps/admin/lib/communication.ts`) pour un événement déjà catalogué. Pour
un nouvel événement : ajouter l'entrée dans `EvenementCommunication` +
`EVENEMENT_MODELE_CODE` + `EVENEMENT_CANAL`
(`communication/events/index.ts`), et le modèle de message dans
`modeles_notification` via une migration — jamais de texte codé en dur
dans le composant.

## Critères de validation

- [ ] Aucun nouveau statut ajouté à `course_status` sans avoir vérifié
      qu'un statut existant ne convient pas déjà
- [ ] Décision/motif/résultat journalisé dans une table dédiée
      append-only, colonnes typées (pas de `jsonb` fourre-tout évitable)
- [ ] Transition de statut sensible exclusivement via une RPC
      `security definer` qui pose `colimo.systeme_interne` avant l'update
- [ ] Affichage via `StatusTimeline`/`BandeauStatut`, pas un patron parallèle
- [ ] Toute communication passe par `communication.send()`/`notifierEvenement()`,
      jamais un fournisseur ou la table `notifications` en direct
