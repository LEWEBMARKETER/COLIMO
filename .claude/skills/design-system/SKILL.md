---
name: design-system
description: >
  Gardien des tokens et de la cohérence visuelle entre apps/mobile et
  apps/admin COLIMO. Utiliser ce skill avant de créer un composant UI,
  d'ajouter/modifier une couleur, une police, un radius, une ombre, ou
  d'évaluer l'intégration d'une bibliothèque de composants (ex. shadcn/ui).
---

# Design System — COLIMO

Ce skill complète `world-class-ui-ux` (sections 7 « Color System » et 23
« Design System First ») : il n'y répète pas les principes génériques, il
documente et fait respecter le système de tokens **réel** de ce repo.

## Source unique de vérité

`packages/shared/src/theme/index.ts` exporte `colors` et `fonts` — c'est
**le seul endroit** où une couleur ou une police doit être définie.

```ts
colors.rougePrincipal  #C41E24   colors.rougeFonce   #9E1419
colors.rougeClair      #FBE7E7   colors.neutreFonce  #2B2622
colors.neutreClair     #F1EDEA   colors.fond         #FAF8F5
colors.noir            #18140F   colors.noirClair    #26201A
fonts.titre = "Poppins"   fonts.texte = "Inter"
```

Consommé en miroir par les deux apps :
- `apps/mobile/tailwind.config.js` — valeurs **dupliquées en dur** (le
  loader de config Tailwind côté RN ne peut pas `require()` un fichier
  TypeScript). Toute évolution de `theme/index.ts` doit être répercutée
  manuellement ici.
- `apps/admin/tailwind.config.ts` — importe `colors`/`fonts` directement
  depuis `@colimo/shared`, pas de duplication.

**Procédure pour toute nouvelle couleur/police** : 1) l'ajouter dans
`theme/index.ts`, 2) la répercuter dans `apps/mobile/tailwind.config.js`,
3) elle est automatiquement disponible côté admin. Ne jamais écrire un hex
en dur dans un écran ou un composant sans passer par cette chaîne — sauf
sur les primitives qui n'acceptent pas `className` (voir skill
`mobile-ux`), où le hex de `theme/index.ts` est la seule option légitime.

## Lacune connue : pas de tokens sémantiques

La palette n'a **aucun** token succès/alerte/danger/info officiel. Deux
implémentations parallèles ont comblé le vide séparément, sans lien avec
la marque :
- Admin — `apps/admin/components/StatutBadge.tsx` : palette Tailwind par
  défaut (`bg-emerald-100`, `bg-amber-100`, `bg-red-100`, `bg-blue-100`...),
  utilisée sur 10+ pages.
- Mobile — `apps/mobile/components/ui/StatutChip.tsx`
  (`TEINTES_STATUT`) : valeurs hex propres (`#1D4ED8`, `#047857`...),
  différentes de celles de l'admin pour un statut équivalent.

**Avant d'ajouter une nouvelle couleur de statut** : vérifier si le besoin
peut être couvert en étendant `theme/index.ts` avec de vrais tokens
`succes`/`alerte`/`danger`/`info` (dérivés de la palette existante, pas de
nouvelles teintes arbitraires) plutôt que de piocher un nouveau `bg-*-100`
Tailwind par défaut ou un nouveau hex isolé. À terme, `StatutBadge` et
`StatutChip` doivent converger vers cette source commune.

## Radius, ombre, composants

Aujourd'hui : un radius unique et systématique (`rounded-full` sur tous
les boutons, `rounded-2xl` sur toutes les cartes, mobile et admin), aucune
variation selon la hiérarchie. Si ce skill est invoqué pour trancher un
radius/une ombre sur un nouvel élément, proposer une échelle à 2-3 niveaux
(ex. `sm` pour inputs/badges, `md` pour cartes, `full` réservé aux
boutons pilule et avatars) plutôt que de renforcer l'uniformité actuelle.

**Avant de créer un composant UI** : chercher dans
`apps/mobile/components/ui/` (10 composants, voir skill `mobile-ux`) ou
`apps/admin/components/` (pas de dossier `ui/` dédié côté admin
aujourd'hui — `StatCard`, `BadgePill`, `NoteEtoiles`, `NiveauBadge`,
`ChampMotDePasse`, `DetailCourseModal`, `StatutBadge`). Ne jamais dupliquer
une variante visuelle d'un composant existant.

## Iconographie

- Mobile : `@expo/vector-icons/Ionicons`, cohérent partout.
- Admin : **aucune bibliothèque** aujourd'hui — emojis inline (👁️ ✅ ⏳
  📷 ♻️ 🗑️) et un unique SVG fait main (`ChampMotDePasse.tsx`, toggle
  œil). Toute nouvelle icône admin doit d'abord évaluer une vraie lib
  (Lucide via le skill `shadcn` si disponible, ou un équivalent web)
  plutôt qu'ajouter un nouvel emoji.

## Si une bibliothèque de composants est intégrée (shadcn/ui)

Les skills `shadcn` et `migrate-radix-to-base` sont disponibles séparément
pour la mécanique d'installation/composition. Règle de ce skill-ci : les
tokens shadcn (`--primary`, `--background`, `--muted-foreground`...)
doivent être **mappés sur `colors.rougePrincipal`/`colors.fond`/etc.**,
jamais laissés sur un preset shadcn par défaut (`nova`, `vega`...) qui
importerait une identité visuelle étrangère à COLIMO. shadcn/ui ne
s'applique qu'à `apps/admin` (composants DOM/Radix) — jamais à
`apps/mobile` (React Native, pas de DOM).

## Critères de validation

- [ ] Nouvelle couleur/police ajoutée dans `theme/index.ts` d'abord, jamais
      un hex en dur dans un écran
- [ ] Les deux `tailwind.config` restent synchronisés avec `theme/index.ts`
- [ ] Pas de nouveau `bg-emerald-*`/`bg-amber-*`/hex isolé sans vérifier
      qu'un token sémantique n'existe pas déjà
- [ ] Composant existant réutilisé/étendu avant d'en créer un nouveau
- [ ] Radius/ombre cohérents avec l'échelle en vigueur (ou proposition
      explicite de la faire évoluer, pas un cas isolé de plus)
- [ ] Tokens shadcn (si utilisés) mappés sur la palette COLIMO, jamais un
      preset par défaut
