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
listés — jamais un balayage de tout `apps/mobile`/`apps/admin`.

## Procédure

1. Lister les fichiers réellement modifiés (diff / PR / liste fournie) —
   ne pas élargir le périmètre de sa propre initiative.
2. Pour chaque fichier, vérifier contre les quatre skills opérationnels,
   dans cet ordre :
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
3. Ne jamais corriger silencieusement pendant la relecture — signaler
   chaque constat, sauf demande explicite de corriger en même temps.

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
