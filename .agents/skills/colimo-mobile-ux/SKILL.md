---
name: colimo-mobile-ux
description: >
  Patrons de navigation, de segmentation de formulaire, de feedback et de
  fraîcheur des données pour apps/mobile (Expo Router + NativeWind, PWA).
  Utiliser pour tout écran affichant une donnée qui peut changer côté
  serveur pendant que l'app reste ouverte (forfait, statut de candidature,
  compteur de notifications), pour toute décision de structure d'écran,
  de navigation, de formulaire multi-étapes, de geste, de cible tactile,
  ou d'état de chargement/erreur/vide.
---

# Mobile UX — COLIMO

## Mission

Faire en sorte que COLIMO donne l'impression d'une application mobile
moderne **même en fonctionnant comme PWA** (build `expo export -p web`,
servie sur colimo.online). Ce qui compte pour cette impression dans ce
repo : navigation par onglets natifs (pas de rechargement de page),
feedback immédiat sur chaque action (`Bouton` en état `chargement`),
transitions `react-native-reanimated` plutôt que des sauts d'état bruts
(voir `.claude/skills/motion-design` pour l'implémentation).

## Navigation

**Structure réelle actuelle** (`(client)/(tabs)/_layout.tsx`) : Accueil
(`index`) / Historique / Statistiques / Soutien (`support`) / Profil — 5
onglets en bottom navigation, déjà l'architecture recommandée. **Ne pas la
remplacer** par une autre liste de destinations (ex. un onglet
« Commander » séparé) sans raison précise : la création de livraison est
volontairement un CTA depuis l'Accueil, pas un onglet à part, et les
notifications passent par la cloche (`ClocheNotifications`) dans l'en-tête
plutôt qu'un onglet dédié — les deux choix sont déjà cohérents avec
« limiter la navigation principale aux destinations réellement
importantes », pas des lacunes à corriger.

## Règle du pouce

Placer les actions fréquentes en zone facilement accessible ; éviter un
CTA important uniquement en haut d'un écran long. `FondEntete` (en-tête
des tableaux de bord) et le patron de barre d'action fixe en bas d'écran
(`track/[id].tsx` : bloc `border-t ... bg-colimo-fond px-6 pb-2 pt-3`
contenant le CTA principal) sont les deux précédents à répliquer plutôt
que de placer un CTA critique seulement en haut d'un `ScrollView`.

## Bottom Sheets — recommandation, pas encore construite

Aucune bibliothèque de bottom sheet n'est installée (`@gorhom/bottom-sheet`,
`react-native-modal` : absentes de `package.json`) et aucun composant
`Modal`/`BottomSheet` n'existe dans `apps/mobile/components/ui/` — vérifié,
gap réel (voir aussi `colimo-design-system`). Les sélections qui s'y
prêteraient le mieux (adresse, horaire, type de livraison, filtres) sont
aujourd'hui gérées **en écran complet** ou **en section inline** d'un
Stepper (`SelecteurPointCarte`, `SelecteurCreneauProgramme`,
`GroupePastilles`) — un choix qui fonctionne mais n'est pas un bottom
sheet. **Ne pas introduire une lib de bottom sheet spéculativement** :
si une tâche future en a explicitement besoin, la choisir alors (en
cohérence avec `react-native-reanimated` déjà installé, qui peut animer un
bottom sheet fait main sans dépendance supplémentaire) et mettre à jour
cette section avec le nom réel du composant créé.

## Formulaires

Formulaire de plus de 5 champs → découper avec `Stepper`
(`components/ui/Stepper.tsx`). Précédent réel : `publish.tsx`
(`ETAPES = ["Récupération", "Livraison", "Colis", "Options", "Paiement",
"Confirmation"]`, 6 étapes, état conservé entre étapes via `useState` au
niveau de l'écran — c'est le patron à copier). **Gap identifié** :
`nouvelle-livraison.tsx` (création de livraison côté commerce) n'utilise
**pas** `Stepper` malgré une longueur comparable — c'est un long
`ScrollView` à sections (`TitreSection`). Si cet écran est retouché en
profondeur, le segmenter est cohérent avec `publish.tsx` ; ne pas le faire
à l'occasion d'un correctif ponctuel non lié à sa structure.

Toujours conserver les informations déjà saisies en changeant d'étape
(état React au niveau de l'écran parent, jamais réinitialisé entre deux
`etape`) — déjà le comportement de `Stepper`/`publish.tsx`, à ne pas casser.

## Feedback

Après toute action importante : chargement visible, double-tap impossible,
succès confirmé, erreur explicite, action de récupération proposée.
Concrètement : passer la prop `chargement` de `Bouton` pendant l'appel
async — le composant se désactive automatiquement pendant ce temps
(`const desactive = Boolean(disabled) || chargement`), ce qui couvre à la
fois l'indicateur visuel et l'anti-double-tap **en un seul geste**. Ne
jamais lancer un appel réseau depuis un `onPress` sans cette prop. Pour
l'erreur : message explicite dans le composant (voir patron
`erreur ? <Text className="text-colimo-rouge">...` déjà répandu), jamais
une alerte système bloquante à la place.

## Onglets persistants vs écrans de pile — la distinction qui compte

Expo Router a deux familles d'écrans dans `apps/mobile/app/` :

- **Onglets** (`(client)/(tabs)/*`, `(coursier)/(tabs)/*`) : montés une fois,
  **jamais démontés** quand on change d'onglet. Un `useEffect(() => {...},
  [session])` ne s'y exécute qu'au tout premier affichage de l'onglet dans
  la session de l'app.
- **Écrans de pile** (`(client)/commerce/*`, `(client)/track/[id]`, etc.,
  ouverts via `router.push(...)`) : démontés/remontés à chaque navigation —
  un `useEffect` classique y suffit, la donnée est fraîche à chaque visite.

**Bug de référence (corrigé, PR #51)** : `CommerceDashboard.tsx` (onglet
Accueil) et `statistiques.tsx` ne rechargeaient leurs données qu'au premier
montage. Un changement de forfait (Starter activé par l'admin pendant que
l'app était déjà ouverte) restait invisible sur ces onglets jusqu'à un
redémarrage complet de l'app, alors que l'écran aurait dû refléter le
changement immédiatement.

**Règle** : tout écran d'onglet affichant une donnée qui peut changer
côté serveur pendant que l'app reste ouverte (forfait effectif, statut
d'une candidature, compteur de notifications, disponibilité...) doit
recharger via `useFocusEffect` (import `expo-router`) + `useCallback`, pas
un simple `useEffect`. Précédent établi : `(coursier)/(tabs)/dashboard.tsx`.

```tsx
useFocusEffect(
  useCallback(() => {
    if (!session) return;
    getMonCommerce(session.user.id).then(setCommerce);
  }, [session])
);
```

## Ne jamais grouper des requêtes indépendantes dans un seul Promise.all

**Bug de référence (corrigé, PR #52)** : `statistiques.tsx` groupait
`getCourses`, `getCoursiers` et `getMonCommerce` dans un seul `Promise.all`.
`getCoursiers()` peut légitimement échouer ou renvoyer un résultat partiel
selon ce que la RLS autorise le compte appelant à voir (cf. skill
`colimo-delivery-flow`) — son rejet faisait échouer tout le lot, y compris
`getMonCommerce`, et l'écran retombait sur l'état "forfait gratuit" par
défaut alors que l'abonnement était bien actif.

**Règle** : si une requête peut échouer indépendamment d'une autre qui
conditionne un état critique visible (forfait, verrouillage d'écran), ne
jamais les grouper dans un `Promise.all` — des `.then()` indépendants
laissent chaque état se mettre à jour séparément.

## Composants et cibles tactiles

Réutiliser les composants de `colimo-design-system` — jamais recréer une
variante à la main. Toute action déclenchée par un `<Text onPress>` ou une
icône seule reçoit `hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}`
au minimum, ou un padding généreux (`py-3 px-4`).

## États (chargement / vide / erreur)

- Jamais de `return null` en attendant une session/donnée — toujours un
  `ActivityIndicator color="#C41E24"` dans un `SafeAreaView` centré.
- Toujours `.catch` sur un fetch affiché à l'écran, avec message d'erreur
  explicite — jamais un échec silencieux qui ressemble à une liste vide.
- Modèle complet à imiter : `ChatThread.tsx`, `EcranNotifications.tsx`.

## Animations

Uniquement des animations fonctionnelles : changement de statut,
progression, ouverture d'un bottom sheet (le jour où il existe),
skeleton, confirmation, transition légère — jamais une animation
décorative qui ralentit la navigation. Pour le **comment** (bibliothèque,
durée, easing), voir `.claude/skills/motion-design` — ce skill-ci ne fixe
que le **quoi/pourquoi**, pas l'implémentation.

## Contrainte NativeWind

`ActivityIndicator`, `Ionicons color`, `Switch.trackColor` n'acceptent pas
`className` — utiliser directement les valeurs hex de
`packages/shared/src/theme` (jamais forcer une classe Tailwind dessus).

## Critères de validation

- [ ] Navigation principale inchangée sauf besoin réel démontré (5 onglets existants)
- [ ] CTA fréquent/critique atteignable sans scroller jusqu'en haut
- [ ] Formulaire de plus de 5 champs découpé via `Stepper`, état conservé entre étapes
- [ ] Toute action async passe par `Bouton` en `chargement` (anti-double-tap inclus)
- [ ] Écran d'onglet avec donnée mutable côté serveur → `useFocusEffect`,
      pas `useEffect` seul
- [ ] Aucune requête indépendante groupée dans un `Promise.all` avec une
      requête dont dépend un état critique affiché
- [ ] Composants `ui/` réutilisés, aucune variante recréée à la main
- [ ] Toute action-lien texte a un `hitSlop`/padding ≥ zone confortable
- [ ] Chargement initial toujours visible, erreur réseau explicite avec retry
- [ ] Animation ajoutée : fonctionnelle uniquement, conforme à `motion-design`
