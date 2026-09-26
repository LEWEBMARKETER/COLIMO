---
name: colimo-design-system
description: >
  Source unique de vérité pour les tokens visuels et les composants UI
  partagés entre apps/mobile et apps/admin COLIMO. Utiliser avant de créer
  un composant, d'ajouter/modifier une couleur, une police, un radius ou
  une ombre, ou avant d'introduire une bibliothèque de composants tierce.
---

# Design System — COLIMO

Documente le système **réel** de ce repo (pas un idéal théorique) : où vivent
les tokens, quels composants existent déjà, et quelles incohérences connues
ne pas reproduire.

## Où vivent les tokens

Source unique : `packages/shared/src/theme/index.ts`.

| Token | Valeur |
|---|---|
| `colors.rougePrincipal` | `#C41E24` |
| `colors.rougeFonce` | `#9E1419` |
| `colors.rougeClair` | `#FBE7E7` |
| `colors.neutreFonce` | `#2B2622` |
| `colors.neutreClair` | `#F1EDEA` |
| `colors.fond` | `#FAF8F5` |
| `colors.noir` | `#18140F` |
| `colors.noirClair` | `#26201A` |
| `fonts.titre` | Poppins |
| `fonts.texte` | Inter |

Ces valeurs sont **dupliquées** dans `apps/mobile/tailwind.config.js` (à la
main — NativeWind ne peut pas `require()` un fichier TypeScript) et
**importées directement** dans `apps/admin/tailwind.config.ts`. Toute
modification d'un token doit être répercutée dans les trois fichiers, dans
cet ordre : `theme/index.ts` → `apps/admin/tailwind.config.ts` (automatique
si l'import est bien utilisé) → `apps/mobile/tailwind.config.js` (à la main).
Ne jamais coder une valeur hex en dur dans un composant si un token existe
déjà pour elle.

## Composants à réutiliser — mobile (`apps/mobile/components/ui/`)

`Bouton` (3 variantes primaire/contour/blanc, `rounded-full py-4`), `Carte`
(bordure claire par défaut, `sombre` pour un fond plein `colimo-noir-clair`,
`degrade` pour un dégradé `LinearGradient` — variante gérée par deux props
combinables, jamais un composant séparé), `ChampTexte`, `GroupePastilles`
(prop `defilement` pour un scroll horizontal), `ChiffreCle`, `Stepper`,
`CarteAction`, `CarteInfoConfiance`, `CarteCourseRecente`, `StatutChip`,
`VariationBadge` (badge de comparaison de période, `+X%`/`-X%`, prop
`inverse` pour les métriques où une hausse est négative — ex. une dépense).

**Règle non négociable** : ne jamais recréer à la main une variante d'un de
ces composants (`rounded-2xl bg-white p-5 shadow-sm` au lieu d'importer
`Carte`, `py-3` au lieu de `py-4` sur un bouton...). Si un besoin n'est pas
couvert, **étendre le composant avec une nouvelle prop** (précédent :
`Carte`'s `degrade`), jamais dupliquer son rendu ailleurs.

## Composants à réutiliser — admin (`apps/admin/components/`)

`StatCard` (tuile chiffre-clé, prop `sombre`), `StatutBadge` (pastille de
statut, palette dans l'objet `COULEURS` du fichier), `BadgePill`,
`NiveauBadge`, `NoteEtoiles`. Modale : le patron établi est
`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4`
(overlay, `onClick={onClose}`) contenant un
`rounded-2xl bg-white p-6 shadow-lg` (`onClick={(e) => e.stopPropagation()}`)
— voir `DetailCourseModal.tsx` et `ValidationLivraisonModal.tsx`. Ne pas
inventer un autre patron de modale.

## Incohérence connue à ne pas aggraver

**Aucun token sémantique** (succès/alerte/danger/info) n'existe encore.
`StatutChip` (mobile, `TEINTES_STATUT`) et `StatutBadge` (admin, `COULEURS`)
définissent chacun leur propre palette de statuts, de façon indépendante —
un commentaire dans `StatutChip.tsx` documente explicitement l'intention
qu'elles restent alignées : « Même vocabulaire de couleur que StatutBadge
côté admin : un statut se lit de la même façon des deux côtés de la
plateforme. » **Toute nouvelle valeur de statut doit être ajoutée aux deux
palettes en même temps**, avec la même intention de couleur (succès =
émeraude, attente = ambre, échec = rouge COLIMO, neutre = gris) — ne pas
laisser diverger, et ne pas introduire une troisième palette ailleurs.

## Avant d'intégrer une bibliothèque de composants tierce (ex. shadcn/ui)

Vérifier d'abord si `Carte`/`Bouton`/`ChampTexte` (mobile) ou l'équivalent
admin couvre déjà le besoin. shadcn/ui n'est initialisé dans aucune des deux
apps à ce jour — avant de l'introduire, confirmer que le composant souhaité
n'existe pas déjà sous un autre nom dans `components/ui/`.

## Critères de validation

- [ ] Aucune couleur hex codée en dur si un token `theme/index.ts` existe
- [ ] Composant réutilisé ou étendu par une prop — jamais dupliqué à la main
- [ ] Nouveau statut ajouté aux deux palettes (`TEINTES_STATUT` et
      `COULEURS`) avec la même intention de couleur
- [ ] Modale admin conforme au patron `DetailCourseModal`/overlay établi
- [ ] Token modifié répercuté dans les trois fichiers (theme + 2 tailwind.config)
