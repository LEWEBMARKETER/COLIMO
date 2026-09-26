---
name: colimo-design-system
description: >
  Source unique de vérité pour les tokens visuels et les composants UI
  partagés entre apps/mobile et apps/admin COLIMO. Utiliser avant de créer
  un composant, d'ajouter/modifier une couleur, une police, un radius ou
  une ombre, avant d'introduire une bibliothèque de composants tierce, ou
  avant de décider si un écran a besoin d'un état (chargement/vide/erreur)
  ou d'un CTA qu'il n'a pas encore.
---

# Design System — COLIMO

## Mission

Maintenir une expérience visuelle cohérente, moderne et professionnelle sur
toute l'application COLIMO. **Ne jamais remplacer l'identité graphique
COLIMO** (couleurs, logo, typographie — voir tokens ci-dessous) par celle
d'une application tierce. S'inspirer des standards UX des meilleures
applications de mobilité, livraison, logistique et SaaS **sans reproduire
leur identité visuelle**.

## Principes

1. Mobile-first — le mobile reste prioritaire même quand un écran existe
   aussi en version desktop (admin).
2. Une action principale clairement identifiable par écran (voir « CTA »
   ci-dessous).
3. Hiérarchie visuelle forte ; réduire le nombre d'informations visibles
   simultanément plutôt que tout afficher à plat.
4. Composants réutilisables — jamais une variante recréée à la main (voir
   « Composants » ci-dessous, règle non négociable déjà en vigueur).
5. Cartes, espaces, sections et regroupements logiques plutôt que des
   écrans surchargés.
6. Icônes cohérentes (Ionicons côté mobile, déjà systématique).
7. Toute action critique fournit un feedback (voir « États obligatoires »
   et « CTA »).

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
si l'import est bien utilisé) → `apps/mobile/tailwind.config.js` (à la
main). Ne jamais coder une valeur hex en dur dans un composant si un token
existe déjà pour elle.

## Composants existants à réutiliser en priorité

Un vocabulaire générique (Button, Input, Card, StatusBadge, Modal...) est
utile pour raisonner, mais **ce repo a déjà des noms réels** — toujours
partir d'eux, jamais recréer sous un nom générique un composant qui existe
déjà sous un nom français.

**Mobile** (`apps/mobile/components/ui/` sauf mention contraire) :

| Générique | Composant réel | Rôle |
|---|---|---|
| Button | `Bouton` | 3 variantes (primaire/contour/blanc), `rounded-full py-4` |
| Input | `ChampTexte` | input avec label, icône optionnelle, toggle mot de passe intégré |
| Select | `GroupePastilles` | sélection en pastilles (`ZoneSelector`, `SelecteurCreneauProgramme` s'appuient dessus) ; prop `defilement` pour un scroll horizontal |
| AddressInput | `SelecteurPointCarte` (`components/`) | pin carte + recherche géocodée + géolocalisation |
| Card | `Carte` | conteneur `rounded-2xl` ; props `sombre` (fond plein) et `degrade` (`LinearGradient`) combinables — jamais un composant séparé pour une variante |
| DeliveryCard | `CarteCourseRecente` | carte compacte de livraison (trajet, `StatutChip`, montant, « Refaire ») |
| StatusBadge | `StatutChip` | pastille de statut de course (palette `TEINTES_STATUT`) |
| — | `VariationBadge` | badge de comparaison de période (`+X%`/`-X%`), prop `inverse` pour les métriques où une hausse est négative |
| StatCard | `ChiffreCle` | mise en avant d'un chiffre (prix, KPI) |
| Stepper | `Stepper` | formulaire multi-étapes (nom identique) |
| Timeline | `StatusTimeline` (`components/`) | timeline de statut de course — voir `colimo-delivery-flow` |
| — | `CarteAction`, `CarteInfoConfiance`, `BandeauStatut`, `CarteUpsellPro`, `CarteProgramme`, `FondEntete` | cartes/bandeaux spécialisés dérivés de `Carte` |

**Admin** (`apps/admin/components/`) :

| Générique | Composant réel | Rôle |
|---|---|---|
| StatCard | `StatCard` | tuile chiffre-clé (nom identique), prop `sombre` |
| StatusBadge | `StatutBadge` | pastille de statut, palette dans l'objet `COULEURS` |
| — | `BadgePill`, `NiveauBadge`, `NoteEtoiles` | badges spécialisés coursiers |
| Modal | patron `DetailCourseModal`/`ValidationLivraisonModal` | `fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4` (overlay) + `rounded-2xl bg-white p-6 shadow-lg` (panneau) |

**Règle non négociable** : ne jamais recréer à la main une variante d'un de
ces composants (`rounded-2xl bg-white p-5 shadow-sm` au lieu d'importer
`Carte`, `py-3` au lieu de `py-4` sur un bouton...). Si un besoin n'est pas
couvert, **étendre le composant avec une nouvelle prop** (précédent :
`Carte`'s `degrade`), jamais dupliquer son rendu ailleurs.

## Composants génériques identifiés comme manquants

Vérifié dans le repo (aucun équivalent trouvé, ni sous un autre nom) — à
construire **seulement si une tâche en a explicitement besoin**, jamais de
façon spéculative :

- **Mobile** : `Modal`/`BottomSheet` (aucune lib installée,
  `react-native-modal`/`@gorhom/bottom-sheet` absents de `package.json`),
  `Toast`/snackbar, `Alert` de confirmation partagé (les confirmations
  n'existent que via un flux d'écran, jamais un `Alert.alert` central),
  `EmptyState` réutilisable (chaque écran écrit son propre
  `ListEmptyComponent` en dur), `Skeleton` (seul `ActivityIndicator`
  existe), `SearchInput` dédié.
- **Admin** : `Select`/dropdown réutilisable (raw `<select>` par page),
  `DataTable` réutilisable (13 pages dupliquent leur propre `<table>`),
  `ConfirmDialog` (≈25 appels à `window.confirm()`/`window.prompt()`
  natifs au lieu d'un composant), `Tabs` générique (état `onglet` +
  boutons réimplantés par page, ex. `paiements/page.tsx`).

Avant de construire l'un de ces composants : vérifier qu'aucune tâche en
cours ne peut simplement réutiliser un composant existant à la place (ex.
`GroupePastilles` couvre souvent le besoin d'un `Select` mobile).

## États obligatoires

Tout composant/écran utilisant des données considère explicitement :
**loading, success, empty, error, disabled**. Concrètement dans ce repo :

- `loading` → `ActivityIndicator color="#C41E24"` (mobile) — jamais un
  écran blanc (`return null`) pendant l'attente d'une session/donnée.
- `error` → toujours un `.catch` avec message explicite ; un échec réseau
  ne doit jamais se déguiser en état `empty`.
- `empty` → message dédié (`ListEmptyComponent` mobile, ligne
  `colSpan` centrée admin) — pas de tableau/liste qui disparaît
  silencieusement.
- `disabled` → géré nativement par `Bouton`/`ChampTexte` (props `disabled`),
  toujours utiliser la prop plutôt qu'un style manuel d'opacité.
- `success` → feedback explicite après une action critique (voir CTA) —
  pas seulement une navigation silencieuse.

`Skeleton` et `EmptyState` réutilisables n'existent pas encore (voir
section précédente) — en attendant, suivre le modèle déjà établi
(`ChatThread.tsx`, `EcranNotifications.tsx` : chargement → erreur → liste
avec `ListEmptyComponent`).

## CTA

Un écran a un **CTA principal dominant**, visuellement plus fort que toute
action secondaire (`Bouton` variante `primaire` vs `contour`/`blanc`).
Exemples déjà en usage dans l'app : « Envoyer un colis », « Confirmer la
réception du colis », « Rejoindre le programme », « Confirmer la
livraison » (admin). Les actions secondaires (annuler, voir les détails)
restent en variante `contour` — ne jamais donner à une action secondaire
le même poids visuel que le CTA principal.

## Accessibilité

- Contraste suffisant : les tokens `rougePrincipal`/`neutreFonce` sur fond
  clair sont déjà conformes ; vérifier tout nouveau texte sur fond `sombre`/`degrade`.
- Cibles tactiles : `hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}`
  minimum sur tout `<Text onPress>`/icône seule (voir `colimo-mobile-ux`).
- Labels compréhensibles : jamais une icône seule sans label/`accessibilityLabel`
  pour une action qui n'est pas universellement reconnue.
- Focus visible + navigation clavier desktop : **gap connu côté admin** —
  `DetailCourseModal`/`ValidationLivraisonModal` n'ont pas de piège de
  focus ni de fermeture par Échap. À corriger si on retouche ces modales,
  pas à ignorer sur une nouvelle.
- Messages d'erreur explicites : jamais un code d'erreur brut affiché à
  l'utilisateur (mapper vers un message humain, comme déjà fait pour les
  erreurs de RPC dans les formulaires admin).

## Responsive

Tester au minimum mobile / tablette / desktop — **le mobile reste
prioritaire**. Gap connu côté admin : la `Sidebar` n'a aucune classe
responsive (desktop-only strict aujourd'hui) — ne pas construire une
nouvelle page admin en supposant que ce problème est résolu ; le signaler
si la tâche touche à la navigation admin, le corriger seulement si
explicitement demandé.

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
n'existe pas déjà sous un autre nom dans `components/ui/`, et que son style
peut se conformer aux tokens COLIMO plutôt qu'à l'identité visuelle par
défaut de la bibliothèque (voir Mission — ne jamais laisser une lib tierce
remplacer l'identité COLIMO).

## Critères de validation

- [ ] Aucune couleur hex codée en dur si un token `theme/index.ts` existe
- [ ] Composant réutilisé ou étendu par une prop — jamais dupliqué à la main
- [ ] Nouveau statut ajouté aux deux palettes (`TEINTES_STATUT` et
      `COULEURS`) avec la même intention de couleur
- [ ] Modale admin conforme au patron `DetailCourseModal`/overlay établi
- [ ] Écran avec données couvre les 5 états (loading/success/empty/error/disabled)
- [ ] Un seul CTA dominant par écran, actions secondaires visuellement plus faibles
- [ ] Cibles tactiles et labels conformes ; gap de focus clavier admin non aggravé
- [ ] Testé au minimum en mobile ; desktop/tablette si l'écran existe aussi côté admin
- [ ] Token modifié répercuté dans les trois fichiers (theme + 2 tailwind.config)
