---
name: motion-design
description: >
  Implémentation concrète des animations et micro-interactions sur
  apps/mobile (react-native-reanimated) et apps/admin (motion). Utiliser
  ce skill pour toute transition, état de chargement animé, feedback de
  tap, animation d'entrée d'écran, ou modification touchant ces
  bibliothèques.
---

# Motion Design — COLIMO

Ce skill complète `world-class-ui-ux` (sections 15 « Motion Design » et 16
« Micro-interactions ») : il n'y répète pas les principes génériques
(150-300ms, respect de `prefers-reduced-motion`...), il indique **avec
quoi et où** les appliquer concrètement dans ce repo.

## Une bibliothèque par app, jamais d'alternative

- **`apps/mobile`** → `react-native-reanimated` (~3.10.1, déjà installé).
  Utiliser `useAnimatedStyle`/`useSharedValue`/`withTiming`. Ne pas
  utiliser l'API `Animated` historique de React Native sauf si le fichier
  modifié l'utilise déjà (cohérence locale).
- **`apps/admin`** → `motion` (ex-framer-motion, `^13.4.1`, installé
  sept. 2026, **pas encore utilisé** dans le code — toute première
  utilisation sert de précédent, la traiter avec soin). Utiliser
  `motion/react` (`motion.div`, `AnimatePresence`) et le hook
  `useReducedMotion` de la lib pour respecter la préférence système.

Ne jamais introduire une 3e bibliothèque d'animation (CSS transitions
manuelles côté admin, `Animated` côté mobile) sans raison technique
explicite — ça fragmenterait un système déjà cohérent par app.

## Précédents à étudier avant d'écrire une nouvelle animation mobile

- `apps/mobile/components/SplashAnimee.tsx` — écran de lancement animé
  (icône → wordmark → tagline en séquence, fond crème `#FAF8F5`).
- `TelephoneApercu` (dans `accueil.tsx`) — mock de téléphone animé sur la
  page publique, **respecte déjà** `AccessibilityInfo`/reduceMotion :
  c'est la référence à suivre pour toute animation non triviale.

Aucun précédent n'existe encore côté admin avec `motion` — s'inspirer des
patterns `motion/react` standards (fade+slide court pour l'apparition d'un
panneau/modale), pas d'effet décoratif (parallax, particules) sur un
back-office métier.

## Où appliquer une animation en priorité (gaps identifiés)

- **`Bouton.tsx`** (mobile) n'a aucun état "pressed" visuel — `Pressable`
  sans feedback au toucher au-delà du chargement. Un retour tactile léger
  (scale ou opacité, ~100-150ms) comblerait un vrai manque de
  micro-interaction plutôt que d'ajouter de la décoration ailleurs.
- **`DetailCourseModal`** (admin) apparaît/disparaît en mount/unmount sec,
  sans transition — bon candidat pour une première utilisation sobre de
  `motion` (fade + léger scale de l'overlay et du panneau).
- Panneaux de confirmation ancrés (annulation, litige, abonnement dans les
  pages admin) : même traitement que `DetailCourseModal` pour rester
  cohérent, pas un style différent par panneau.

## Règles dures

- Une animation ne bloque **jamais** une action métier critique (paiement,
  vérification OTP, résolution de litige) au-delà de sa propre durée.
- Une animation n'est **jamais** la seule confirmation qu'une action a
  réussi — toujours coupler à un état/message persistant. Le repo a déjà
  un vocabulaire de succès texte (`✓` dans `profil.tsx`,
  `compte/mot-de-passe.tsx`) : l'animer en **plus**, jamais à la place.
- Respecter la préférence de mouvement réduit à chaque fois, pas
  seulement quand un précédent le fait déjà : `AccessibilityInfo` côté
  mobile, `useReducedMotion` (`motion`) côté admin.

## Critères de validation

- [ ] `react-native-reanimated` côté mobile, `motion` côté admin — jamais
      l'inverse, jamais une 3e lib introduite sans raison explicite
- [ ] Durée dans la fourchette 150-300ms pour une transition d'UI standard
- [ ] Préférence de mouvement réduit vérifiée dans le code, pas supposée
- [ ] Aucune action métier critique retardée au-delà de la durée de
      l'animation
- [ ] Le succès d'une action reste lisible même animation terminée/coupée
- [ ] Cohérent avec un précédent existant du repo si un pattern similaire
      existe déjà (`SplashAnimee.tsx`, `TelephoneApercu`)
