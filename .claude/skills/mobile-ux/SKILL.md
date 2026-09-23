---
name: mobile-ux
description: >
  Spécialiste UX de l'app mobile COLIMO (Expo/React Native + NativeWind).
  Utiliser ce skill pour tout travail sur apps/mobile/app ou
  apps/mobile/components : nouvel écran, formulaire, navigation, geste,
  cible tactile, état de chargement/erreur/vide côté mobile.
---

# Mobile UX — COLIMO

Ce skill complète `world-class-ui-ux` : il ne répète pas ses principes
génériques (hiérarchie, spacing, accessibilité...), il les applique
concrètement à l'architecture réelle de `apps/mobile`. Charge aussi
`world-class-ui-ux` pour les fondamentaux si ce n'est pas déjà fait.

## Stack réelle

Expo SDK 51 / React Native 0.74 / Expo Router 3 (routage par fichiers,
groupes `(client)`, `(coursier)`, `(auth)`, tabs via `(tabs)/_layout.tsx`).
Styles via NativeWind 4 (classes Tailwind). Build web : `expo export -p web`
→ PWA sur colimo.online. `react-native-reanimated` déjà installé (voir skill
`motion-design` pour son usage). `react-native-safe-area-context` pour les
zones sûres.

## Composants à réutiliser en priorité (`apps/mobile/components/ui/`)

| Composant | Rôle |
|---|---|
| `Bouton` | 3 variantes (primaire/contour/blanc), `rounded-full`, `py-4` |
| `Carte` | conteneur `rounded-2xl`, bordure claire ou fond sombre — **la seule** forme de carte blanche officielle |
| `ChampTexte` | input avec label, icône optionnelle, toggle mot de passe intégré |
| `GroupePastilles` | sélection à choix multiples/uniques en pastilles |
| `ChiffreCle` | mise en avant d'un chiffre (prix, KPI) |
| `Stepper` | formulaire multi-étapes |
| `CarteAction`, `CarteInfoConfiance`, `CarteCourseRecente` | cartes spécialisées dérivées de `Carte` |
| `StatutChip` | pastille de statut de course (voir skill `design-system` pour la palette) |

**Règle non négociable** : ne jamais recréer à la main une variante d'un de
ces composants (`rounded-2xl bg-white p-5 shadow-sm` au lieu d'importer
`Carte`, `py-3` au lieu de `py-4` sur un bouton...). Un audit (sept. 2026) a
trouvé ce pattern dupliqué dans 7+ écrans (`profil.tsx`,
`compte/mot-de-passe.tsx`, `compte/supprimer.tsx`, `gains.tsx`,
`PaiementAirtelMoney.tsx`, `ParametresCompte.tsx`) — y compris un écran qui
importe `Carte` correctement en haut de fichier puis la contourne 20 lignes
plus bas. Si `Carte` ne couvre pas un besoin (ombre au lieu de bordure, par
exemple), **étends le composant** avec une prop, ne le recrée pas ailleurs.

## Cibles tactiles

Toute action déclenchée par un `<Text onPress>` ou une icône seule doit
recevoir `hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}` au
minimum, ou un padding généreux (`py-3 px-4` type `ParametresCompte.tsx`,
qui est le bon exemple à suivre). Ne pas répéter le pattern
`hitSlop={8}` du toggle mot de passe (`ChampTexte.tsx`) — insuffisant pour
atteindre une zone confortable de 44px. Sur toute l'app, seuls 4 usages de
`hitSlop` existaient avant cette règle : viser plus large désormais.

## États (chargement / vide / erreur)

- Ne jamais `return null` en attendant la session ou une donnée — toujours
  un `ActivityIndicator color="#C41E24"` (couleur déjà utilisée partout
  dans l'app pour cet usage), dans un `SafeAreaView` centré.
- Toujours `.catch` sur un fetch de données à l'affichage d'un écran, avec
  un message d'erreur explicite et une action de retry — jamais un échec
  silencieux qui retombe sur l'état "vide" (déguise une panne réseau en
  liste normalement vide, trouvé sur `gains.tsx`/`en-cours.tsx` avant
  correction).
- Modèle d'état complet à imiter : `ChatThread.tsx` et
  `EcranNotifications.tsx` (chargement → erreur → liste avec
  `ListEmptyComponent`).

## Navigation & formulaires

- Onglet conditionnel (visible seulement pour un profil) : pattern
  `href: estCommerce ? "/(client)/statistiques" : null` dans
  `(tabs)/_layout.tsx`, déjà utilisé pour l'onglet Statistiques — le
  répliquer plutôt qu'inventer un autre mécanisme de masquage.
- Formulaire de plus de 5 champs : découper avec `Stepper`
  (`components/ui/Stepper.tsx`), déjà éprouvé sur `publish.tsx` (6 étapes).
  Les écrans d'inscription (`register-client.tsx`, `register-coursier.tsx`)
  n'utilisent pas encore ce pattern malgré 8-10 champs — à corriger en
  priorité si on retouche l'inscription.

## Contrainte technique NativeWind

Certaines primitives n'acceptent pas `className` (`ActivityIndicator`,
`Ionicons color`, `Switch.trackColor`) : utiliser directement les valeurs
hex de `packages/shared/src/theme` (`#C41E24` rouge, `#2B2622` neutre
foncé...), comme le fait déjà tout le reste du code — ne pas essayer de
forcer une classe Tailwind dessus.

## Critères de validation

- [ ] Composants `ui/` réutilisés, aucune variante recréée à la main
- [ ] Toute action-lien texte a un `hitSlop`/padding ≥ zone confortable
- [ ] Chargement initial toujours visible (spinner), jamais d'écran blanc
- [ ] Erreur réseau explicite avec retry, jamais un faux état "vide"
- [ ] Formulaire de plus de 5 champs découpé via `Stepper`
- [ ] Testé en rendu web (PWA) si le composant touche une primitive
      sensible au className (ActivityIndicator, Switch, Ionicons)
- [ ] Animation éventuelle conforme au skill `motion-design`
