---
name: colimo-ux-reviewer
description: >
  Relit un diff, une PR ou un ensemble de fichiers qui viennent d'être
  modifiés — pas l'application entière — contre les règles des skills
  colimo-design-system, colimo-mobile-ux, colimo-delivery-flow et
  colimo-pro-dashboard. Utiliser après une implémentation, avant de
  proposer une fusion, pour vérifier qu'aucune régression connue n'a été
  réintroduite. Ne jamais l'utiliser pour un audit complet de l'app (→
  utiliser le skill `.claude/skills/ux-audit` pour ce périmètre-là).
---

# UX Reviewer — COLIMO

Ce skill est un **relecteur de changement**, pas un auditeur d'application.
Portée : le diff en cours, une PR précise, ou les fichiers explicitement
listés — jamais un balayage de tout `apps/mobile`/`apps/admin` (pour un
audit pleine-app, charger `.claude/skills/ux-audit` à la place).

## Règle fondamentale : UX et logique métier restent séparées

Ne jamais modifier une fonctionnalité métier (statut de course, règle de
gating, calcul de prix, RPC) uniquement pour améliorer son apparence — ce
sont deux couches distinctes (voir `colimo-delivery-flow`,
`colimo-pro-dashboard`). Si une amélioration UX identifiée pendant la
relecture nécessite réellement un changement métier (ex. un nouvel état
à afficher qui n'a pas d'équivalent dans `course_status`), le signaler
explicitement comme dépendance avant de l'implémenter — ne jamais le
faire silencieusement à l'occasion d'un correctif visuel.

## Procédure

Ne pas commencer par corriger le code. Dans l'ordre :

1. **Analyser** : lister les fichiers réellement modifiés (diff / PR /
   liste fournie) — ne pas élargir le périmètre de sa propre initiative.
2. **Identifier** : pour chaque écran/fichier touché, vérifier contre la
   checklist par écran ci-dessous, puis contre les quatre skills
   opérationnels, dans cet ordre :
   - **colimo-design-system** : couleur codée en dur au lieu d'un token,
     composant recréé à la main au lieu de réutilisé/étendu, nouveau
     statut ajouté à une seule des deux palettes (`TEINTES_STATUT`/`COULEURS`).
   - **colimo-mobile-ux** : écran d'onglet avec donnée mutable côté
     serveur sans `useFocusEffect`, requêtes indépendantes groupées dans
     un `Promise.all` évitable, cible tactile sans `hitSlop`/padding,
     état de chargement/erreur/vide manquant.
   - **colimo-delivery-flow** : nouveau statut `course_status` alors qu'un
     existant convenait, transition de statut hors RPC `security definer`,
     décision métier non journalisée dans une table dédiée, notification
     envoyée hors `communication.send()`/`notifierEvenement()`.
   - **colimo-pro-dashboard** : gating premium uniquement côté interface
     (pas de vérification serveur), forfait lu via `subscriptionPlan` brut
     au lieu de `calculerPlanEffectif()`, écran de verrouillage personnalisé
     au lieu de `CarteUpsellPro`.
3. **Classer la priorité** : chaque constat reçoit une sévérité (bloquant
   / à corriger / suggestion — voir « Format des constats »). Un constat
   qui touche une régression de la liste ci-dessous est toujours au moins
   « à corriger », jamais une simple suggestion.
4. **Corriger** : uniquement sur demande explicite (voir règle ci-dessus)
   — la relecture seule ne modifie rien.
5. **Tester** : si une correction est appliquée, vérifier via
   `pnpm typecheck` (au minimum `packages/shared` + l'app touchée) et,
   pour un changement visuel, une vérification effective à l'écran (build
   web + capture, voir `.claude/skills/ux-audit`/`world-class-ui-ux` pour
   la méthode) plutôt qu'une relecture du code seul.

## Checklist par écran

Pour chaque écran touché par le diff :

- **Compréhension** : l'objectif de l'écran est-il immédiatement clair ?
- **CTA** : l'action principale est-elle évidente et unique (pas deux CTA
  concurrents pour la même action — voir `colimo-pro-dashboard`, Header) ?
- **Navigation** : retour/continuation évidents ?
- **Mobile** : fonctionne sur petit écran (voir `colimo-mobile-ux`,
  contrainte NativeWind incluse) ?
- **Charge cognitive** : pas d'excès d'information au-dessus de la ligne
  de flottaison (voir la limite « 4 KPIs » de `colimo-pro-dashboard`) ?
- **Formulaire** : un champ peut-il être supprimé ou prérempli (adresse
  déjà connue, session déjà identifiée) ?
- **Feedback** : chargement/succès/erreur présents (voir `colimo-mobile-ux`,
  section Feedback : prop `chargement` de `Bouton`) ?
- **Empty state** : que voit un utilisateur sans donnée — un état dédié,
  jamais une liste vide silencieuse ?
- **Erreur** : le message explique-t-il comment continuer, pas seulement
  qu'un problème existe ?
- **Cohérence** : les mêmes actions utilisent-elles les mêmes composants
  (voir `colimo-design-system`, tables de mapping générique→réel) ?
- **Accessibilité** : contraste, taille de cible, focus, labels — voir
  `colimo-design-system` section Accessibilité pour les gaps déjà connus
  (pas de focus-trap/Escape sur les modales admin).
- **Performance** : pas d'animation lourde, d'image non optimisée ou de
  composant superflu ajouté sans besoin.

## Scoring interne (optionnel, pas nécessairement montré à l'utilisateur)

Pour une relecture qui couvre plusieurs écrans, noter en interne :
clarté, navigation, mobile UX, accessibilité, cohérence, feedback,
efficacité — utile pour prioriser quel écran corriger en premier, pas un
livrable à afficher systématiquement dans la réponse.

## Format des constats

Pour chaque problème trouvé : `fichier:ligne`, quelle règle/skill il viole,
sévérité (bloquant / à corriger / suggestion), et une piste de correction
concrète (quel composant/patron réutiliser à la place). Ne jamais mélanger
un constat factuel et une recommandation dans la même phrase — un constat
d'abord, une piste ensuite.

## Régressions à vérifier systématiquement (les plus récentes d'abord)

- Écran d'onglet (`(tabs)/*`) qui recharge ses données via `useEffect`
  seul au lieu de `useFocusEffect` — la régression la plus facile à
  réintroduire, puisque `useEffect` reste syntaxiquement valide et ne
  produit aucune erreur, juste une donnée périmée.
- Requêtes indépendantes regroupées dans un `Promise.all` alors que l'une
  conditionne un état critique affiché (forfait, verrouillage).
- Embed Supabase (`select("*, x:table(*)")`) consommé sans vérifier que le
  champ embarqué peut être `null` selon la RLS de la table jointe — tout
  mapper doit filtrer ou gérer ce cas, jamais supposer l'embed toujours
  présent.
- Carte blanche recréée à la main (`rounded-2xl bg-white p-X shadow-sm`)
  au lieu du composant `Carte`.
- Nouveau statut de course ajouté alors qu'un statut existant convenait déjà.
- Gating premium vérifié uniquement côté interface, sans second verrou serveur.
- `StatutBadge` (admin) ou toute nouvelle pastille de statut hors des
  palettes `COULEURS`/`TEINTES_STATUT` déjà établies.

## Critères de validation (de la relecture elle-même)

- [ ] Portée limitée aux fichiers du diff/PR fourni, rien de plus
- [ ] Chaque constat cite `fichier:ligne` et le skill/règle violé
- [ ] Constats et recommandations jamais mélangés dans la même ligne
- [ ] Les régressions ci-dessus sont explicitement revérifiées, pas juste
      un survol général
- [ ] Aucune correction silencieuse — tout changement est signalé, pas appliqué
      sans qu'on l'ait demandé
- [ ] Checklist par écran passée en revue (compréhension, CTA, navigation,
      mobile, charge cognitive, formulaire, feedback, empty state, erreur,
      cohérence, accessibilité, performance), pas seulement les quatre skills
- [ ] Toute modification UX qui impliquerait un changement métier est
      signalée comme dépendance avant implémentation, jamais mêlée
      silencieusement à un correctif visuel
