---
name: colimo-mobile-ux
description: >
  Patrons de navigation et de fraîcheur des données pour apps/mobile
  (Expo Router + NativeWind). Utiliser pour tout écran affichant une donnée
  qui peut changer côté serveur pendant que l'app reste ouverte (forfait,
  statut de candidature, compteur de notifications), et pour toute
  décision de structure d'écran, geste, cible tactile ou état de
  chargement/erreur/vide.
---

# Mobile UX — COLIMO

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

## Navigation & formulaires

- Onglet conditionnel par profil : `href: estCommerce ? "/(client)/statistiques" : null`
  dans `(tabs)/_layout.tsx` — répliquer ce mécanisme, ne pas en inventer un autre.
- Formulaire de plus de 5 champs : découper avec `Stepper`
  (précédent : `publish.tsx`, 6 étapes).

## Contrainte NativeWind

`ActivityIndicator`, `Ionicons color`, `Switch.trackColor` n'acceptent pas
`className` — utiliser directement les valeurs hex de
`packages/shared/src/theme` (jamais forcer une classe Tailwind dessus).

## Critères de validation

- [ ] Écran d'onglet avec donnée mutable côté serveur → `useFocusEffect`,
      pas `useEffect` seul
- [ ] Aucune requête indépendante groupée dans un `Promise.all` avec une
      requête dont dépend un état critique affiché
- [ ] Composants `ui/` réutilisés, aucune variante recréée à la main
- [ ] Toute action-lien texte a un `hitSlop`/padding ≥ zone confortable
- [ ] Chargement initial toujours visible, erreur réseau explicite avec retry
- [ ] Formulaire de plus de 5 champs découpé via `Stepper`
