# AGENTS.md — COLIMO

Ce fichier oriente tout agent (Claude Code ou autre) travaillant dans ce
repo vers les bonnes règles avant de modifier l'UX/UI. Il n'en répète pas
le contenu — il indique **quel skill charger, et quand**.

## Le repo en bref

Monorepo pnpm : `apps/mobile` (Expo Router + NativeWind, PWA sur
colimo.online), `apps/admin` (Next.js, back-office), `packages/shared`
(types, requêtes Supabase, logique métier partagée), `supabase/migrations`
(SQL appliqué **manuellement** par l'utilisateur dans le SQL Editor — ne
jamais supposer qu'une migration écrite est déjà en production).

## Skills UX/UI — `.agents/skills/`

| Skill | Charger quand… |
|---|---|
| `colimo-design-system` | Créer/modifier un composant UI, une couleur, une police, un radius, une ombre ; évaluer une bibliothèque de composants tierce |
| `colimo-mobile-ux` | Toucher à `apps/mobile/app` ou `apps/mobile/components` : écran, navigation, formulaire, geste, état de chargement/erreur/vide, fraîcheur des données d'un onglet |
| `colimo-delivery-flow` | Toucher au statut d'une course, ajouter un workflow de livraison (échec, litige, annulation, validation), déclencher une notification liée à une course |
| `colimo-pro-dashboard` | Ajouter/modifier une fonctionnalité réservée à un forfait COLIMO PRO, un écran de tableau de bord commerce, tout gating par abonnement |
| `colimo-ux-reviewer` | Relire un diff/une PR déjà écrit(e) avant de proposer une fusion — jamais pour implémenter |

Ces cinq skills documentent l'architecture **produit** de COLIMO
(navigation, statuts de livraison, forfaits). Ils complètent, sans les
dupliquer, les skills de **craft visuel** déjà présents sous
`.claude/skills/` (`world-class-ui-ux`, `design-system`, `mobile-ux`,
`motion-design`, `ux-audit`) — ceux-là couvrent les principes génériques et
l'audit pleine-app ; ceux-ci couvrent les patrons spécifiques à COLIMO et
les bugs de référence déjà rencontrés et corrigés dans ce repo. En cas de
recouvrement apparent entre un skill `.agents/skills/colimo-*` et son
équivalent `.claude/skills/*`, charger les deux : le second donne les
principes, le premier donne les faits concrets de ce repo (chemins de
fichiers, précédents, bugs corrigés).

## Règles transverses non négociables

- **Réutiliser avant de créer.** Chaque skill liste les composants/patrons
  déjà en place — un besoin non couvert s'étend (nouvelle prop), il ne se
  duplique pas ailleurs.
- **Jamais de nouveau statut de course** sans avoir vérifié qu'un statut
  existant (`course_status`, 11 valeurs) ne convient pas déjà — voir
  `colimo-delivery-flow`.
- **Tout gating par forfait ou par rôle est vérifié côté serveur**
  (RLS/RPC), jamais seulement par un `if` dans l'interface.
- **Un écran d'onglet (`(tabs)/*`) affichant une donnée mutable côté
  serveur recharge via `useFocusEffect`**, pas un `useEffect` seul — la
  régression la plus facile à réintroduire silencieusement (voir
  `colimo-mobile-ux`).
- **Ne jamais grouper dans un seul `Promise.all` une requête qui peut
  échouer partiellement (dépendante de la RLS) avec une requête dont
  dépend un état critique affiché.**
- **Les migrations Supabase ne s'appliquent pas toutes seules** — après
  avoir écrit une migration, le dire explicitement et attendre que
  l'utilisateur confirme l'avoir exécutée avant de considérer la
  fonctionnalité disponible en production.
- **`pnpm typecheck`** (racine du repo) doit passer avant de considérer un
  changement terminé — au minimum sur `packages/shared` et l'app touchée.

## Ce fichier n'autorise aucune action de son propre chef

Il oriente vers des règles à appliquer ; il ne remplace pas les
instructions explicites de l'utilisateur ni les garde-fous habituels
(confirmation avant fusion d'une PR, avant toute action destructive ou
irréversible).
