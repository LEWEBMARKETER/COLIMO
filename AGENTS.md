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

## Objectif produit

Expérience standard : Commander → Planifier → Trouver un coursier →
Suivre → Livrer → Confirmer. Pour un compte COLIMO PRO (commerçant) :
Commande → Planification → Dispatch → Suivi → Preuve de livraison →
Reporting — voir `colimo-delivery-flow` pour la correspondance précise
avec les statuts réels (`course_status`) et la nuance importante : COLIMO
n'a pas de moteur de dispatch automatique (pool premier-arrivé-premier-
servi), donc « Dispatch » désigne ce mécanisme de pool, pas une
assignation algorithmique.

L'identité visuelle COLIMO ne se clone jamais sur celle d'une application
tierce (Uber, Bolt, Glovo...) — seuls les principes UX éprouvés
(simplicité, rapidité, feedback, tracking, progressive disclosure,
navigation mobile, hiérarchie, réduction de friction) s'en inspirent. Le
détail de cette règle et des tokens visuels vit dans `colimo-design-system`
(section Mission), pas ici — ne pas la dupliquer.

## Séquence recommandée pour une nouvelle interface

`colimo-design-system` → skill métier concerné (`colimo-delivery-flow`
et/ou `colimo-pro-dashboard`) → `colimo-mobile-ux` (si mobile) →
`colimo-ux-reviewer` avant de proposer une fusion. Ne pas sauter
`colimo-ux-reviewer` même pour un changement perçu comme mineur — c'est
l'étape qui revérifie systématiquement les régressions déjà rencontrées
dans ce repo (`useFocusEffect`, `Promise.all`, embed Supabase nullable...).

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
- **Pas de refonte massive sans nécessité démontrée.** Préférer : audit de
  l'existant → amélioration progressive d'un écran → vérification → écran
  suivant. Un besoin qui touche plusieurs écrans se traite écran par écran,
  pas en un seul changement large qui touche tout à la fois.
- **Chaque écran répond à « quelle est l'action principale que
  l'utilisateur doit faire ici ? »**, de façon immédiatement identifiable
  (un seul CTA principal, pas deux qui se font concurrence).

## Definition of Done — une interface

Une interface n'est terminée que si, en plus des règles ci-dessus :

- responsive (mobile d'abord, puis tablette/desktop pour l'admin) ;
- utilisable sur petit écran (cibles tactiles, pas de contenu coupé) ;
- chargement, état vide et erreurs gérés explicitement (jamais un écran
  blanc ou une liste vide silencieuse) ;
- feedback utilisateur présent sur toute action importante ;
- permissions/gating respectés côté serveur, pas seulement côté interface ;
- aucune régression évidente sur les points déjà documentés dans
  `colimo-ux-reviewer` (section « Régressions à vérifier ») ;
- cohérente avec l'identité et les composants COLIMO existants ;
- relue par `colimo-ux-reviewer` avant de proposer une fusion.

## Priorité en cas d'arbitrage

Simplicité > effets visuels. Compréhension > originalité. Rapidité >
animation. Action > décoration. Cohérence (réutiliser un composant
existant) > multiplication de composants proches.

## Ce fichier n'autorise aucune action de son propre chef

Il oriente vers des règles à appliquer ; il ne remplace pas les
instructions explicites de l'utilisateur ni les garde-fous habituels
(confirmation avant fusion d'une PR, avant toute action destructive ou
irréversible).
