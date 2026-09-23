---
name: ux-audit
description: >
  Procédure d'audit UX/UI répétable pour COLIMO (mobile + admin).
  Utiliser ce skill quand on demande d'auditer, revoir, évaluer ou
  diagnostiquer la qualité de l'interface — jamais pour implémenter
  (implémentation → mobile-ux / design-system / motion-design).
---

# UX Audit — COLIMO

Ce skill complète `world-class-ui-ux` (section 24 « UX Audit ») : il ne
répète pas la checklist générique, il fixe la **méthode** propre à ce
repo — où chercher, comment faire vérifier, quel format produire —
telle qu'elle a fait ses preuves lors de l'audit de référence (sept. 2026).

## Périmètre

Toujours couvrir **les deux apps**, jamais une seule, même si la demande
semble cibler l'une d'elles :
- `apps/mobile/app/**` (~47 écrans) + `apps/mobile/components/**`
- `apps/admin/app/**` (~21 pages) + `apps/admin/components/**`
- `packages/shared/src/theme` (tokens) et les deux `tailwind.config`

## Méthode

1. **Lecture directe** (par l'agent principal, pas délégué) : les fichiers
   de configuration et composants primitifs — `theme/index.ts`, les deux
   `tailwind.config`, `components/ui/Bouton.tsx`/`Carte.tsx`/`ChampTexte.tsx`
   côté mobile, `Sidebar.tsx`/`StatCard.tsx`/`StatutBadge.tsx` côté admin.
   Ce sont des lectures rapides à fort rendement d'information — ne pas
   les déléguer.
2. **Délégation par app** : pour balayer l'ensemble des écrans sans saturer
   le contexte, lancer **deux agents `Explore` en parallèle** (un par app),
   chacun avec une liste exhaustive de fichiers à lire et une grille de
   questions précises (cohérence des composants, couleurs en dur, cibles
   tactiles, états manquants, iconographie, responsive). Toujours préciser
   dans le prompt ce qui est déjà connu pour éviter la redécouverte.
   Exiger des citations `fichier:ligne` pour chaque constat, et une
   consigne explicite : « factuel, pas de recommandation — l'analyse est
   faite par l'agent principal ».
3. **Lecture seule stricte** : ne jamais modifier de fichier pendant un
   audit, sauf demande explicite de corriger en même temps. Le dire
   clairement dans les prompts des agents délégués.

## Format du rapport

Toujours structurer selon ces six axes (format déjà validé avec
l'utilisateur) :
1. Stack & technologies
2. Composants UI déjà installés
3. Couleurs & typographies
4. Problèmes d'ergonomie mobile
5. Incohérences visuelles entre pages
6. Plan d'amélioration phasé

Séparer strictement **constats sourcés** (fichier:ligne) et
**recommandations** — ne jamais mélanger les deux dans une même liste. Le
plan d'amélioration final doit être phasé par risque croissant : d'abord
converger vers l'existant (zéro nouvelle fonctionnalité), puis combler les
états manquants (fiabilité perçue), puis l'accessibilité, puis le polish.

## Régressions à revérifier systématiquement

À chaque nouvel audit, vérifier explicitement si ces constats de
référence (sept. 2026) ont été corrigés, sont toujours présents, ou ont
réapparu ailleurs — ne pas repartir de zéro à chaque fois :

- Carte blanche recréée à la main (`rounded-2xl bg-white p-X shadow-sm`)
  au lieu du composant `Carte` (mobile).
- Cibles tactiles sous ~44px sur des `<Text onPress>` sans `hitSlop`.
- Écrans blancs (`return null`) pendant un chargement de session/données.
- Chargements sans `.catch`, échec réseau silencieux déguisé en état vide.
- `StatutBadge` (admin) hors palette COLIMO (Tailwind par défaut).
- Sidebar admin sans aucune classe responsive (desktop-only strict).
- Confirmations via `window.confirm()`/`alert()`/`prompt()` natifs côté
  admin au lieu du design system.
- `DetailCourseModal` et panneaux de confirmation sans accessibilité
  clavier (pas de `role="dialog"`, pas de piège de focus, pas d'Échap).
- Deux représentations différentes de « retour » en navigation (flèche
  texte vs `Ionicons chevron-back`).
- Formulaires d'inscription non découpés malgré le composant `Stepper`
  disponible et déjà utilisé sur `publish.tsx`.

## Critères de validation (du rapport lui-même)

- [ ] Couvre les deux apps, pas une seule
- [ ] Chaque constat est sourcé (fichier:ligne)
- [ ] Constats et recommandations clairement séparés
- [ ] Les régressions de référence ci-dessus sont explicitement revérifiées
- [ ] Se termine par un plan phasé par risque croissant, pas une liste plate
- [ ] Aucun fichier modifié pendant l'audit (sauf demande explicite contraire)
