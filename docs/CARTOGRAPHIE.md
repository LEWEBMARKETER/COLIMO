# Cartographie — COLIMO

Affichage de carte et géocodage sans aucune API cartographique payante ni clé
Google Maps Platform. Uniquement des services OpenStreetMap (gratuits).

## Architecture

```
Mobile iOS/Android (apps/mobile)     Mobile web/PWA (apps/mobile)      Admin (apps/admin)
      │                                    │                                │
      ▼                                    ▼                                ▼
CarteOSM.tsx (react-native-webview   CarteOSM.web.tsx (react-leaflet   CarteCourses (react-leaflet,
+ Leaflet.js chargé en CDN           direct, résolu automatiquement    tuiles OSM, dynamic import
dans le HTML injecté)                par Metro sur le web — RNW n'a    ssr:false)
                                      pas d'implémentation web)
      │                                    │                                │
      └───────────────┬────────────────────┴────────────────────────────────┘
                       ▼
         tuiles OSM : tile.openstreetmap.org
                       │
      ┌────────────────┴────────────────┐
      ▼                                  ▼
packages/shared/src/maps/nominatim.ts   packages/shared/src/maps/osrm.ts
(géocodage / géocodage inverse)         (itinéraire suggéré, affichage seul)
```

Le tarif d'une course reste calculé uniquement par `distanceKm` (Haversine,
`packages/shared/src/maps/index.ts`) — indépendant de tout service externe.
OSRM ne sert qu'à l'affichage (tracé + durée indicative) ; Nominatim ne sert
qu'à convertir une adresse tapée en point de départ sur la carte.

## Où se trouve le code

- `packages/shared/src/maps/index.ts` — `distanceKm`, `tempsEstimeMinutes`,
  `lienGoogleMaps` (inchangés), `Coordonnees`, `CENTRES_ZONES` (centres
  approximatifs des 6 zones, pour centrer la carte par défaut uniquement)
- `packages/shared/src/maps/nominatim.ts` — `geocoderAdresse`,
  `geocoderInverse`, avec cache mémoire + file d'attente (1 req/s max)
- `packages/shared/src/maps/osrm.ts` — `obtenirItineraire`, avec repli
  automatique sur la ligne droite en cas d'échec
- `apps/mobile/components/CarteOSM.tsx` — composant carte de base pour iOS et
  Android (WebView + Leaflet.js en CDN dans le HTML injecté)
- `apps/mobile/components/CarteOSM.web.tsx` — même composant (mêmes props),
  ré-implémenté avec `react-leaflet` pour le web. **Nécessaire** :
  `react-native-webview` n'a aucune implémentation web (son propre code
  source affiche "React Native WebView does not support this platform" sur
  ce type de build) — Metro (bundler web d'Expo) résout automatiquement ce
  fichier `.web.tsx` à la place de `CarteOSM.tsx` sur le web, sans rien à
  faire dans les écrans qui utilisent `CarteOSM`
- `apps/mobile/components/SelecteurPointCarte.tsx` — recherche d'adresse +
  GPS + pin déplaçable, utilisé à la publication d'une course
  (`(client)/publish.tsx`, `(client)/nouvelle-livraison.tsx`)
- `apps/mobile/components/CarteItineraire.tsx` — visualisation départ/arrivée
  + tracé OSRM, utilisé au suivi de course (`(client)/track/[id].tsx`,
  `(coursier)/course/[id].tsx`)
- `apps/admin/components/CarteCourses.tsx` / `CarteCoursesInner.tsx` —
  carte Leaflet des courses actives, page `/courses`

## Limites connues (à garder en tête)

- **Couverture OSM en zone périurbaine** : le maillage OSM est dense sur
  Libreville, plus lâche sur PK12/Bikélé/Ntoum (rues informelles non
  nommées). La recherche d'adresse peut échouer ou être imprécise dans ces
  zones — c'est pour cela que le point reste toujours ajustable manuellement
  sur la carte (glisser le pin ou toucher un autre endroit), jamais imposé
  par le géocodage seul.
- **Politique d'usage Nominatim** : le service public exige un `User-Agent`
  identifiant l'app et limite à 1 requête/seconde. Le `User-Agent` est fixé
  côté app native, mais **pas modifiable depuis un navigateur** (restriction
  du navigateur lui-même) — donc non respecté à 100 % sur la version web/PWA.
  La limite d'1 req/s n'est garantie que par appareil (cache + file
  d'attente locale), pas globalement entre tous les utilisateurs. Si le
  volume augmente sensiblement, il faudra passer par un proxy serveur
  (fonction Supabase Edge) qui centralise le débit et porte le bon
  User-Agent — non fait pour l'instant, faute d'accès réseau pour déployer
  une fonction serveur depuis cet environnement de développement.
- **OSRM (`router.project-osrm.org`)** : instance publique de démonstration,
  sans garantie de disponibilité. Un échec retombe silencieusement sur la
  distance à vol d'oiseau (`distanceKm`) pour l'affichage — le tarif n'est
  jamais impacté.
- **Tuiles `tile.openstreetmap.org`** : gratuites mais avec une politique
  d'usage qui décourage un trafic de production important sans mise en
  cache/CDN propre. Suffisant pour le stade actuel du projet ; à surveiller
  si le nombre d'utilisateurs simultanés grossit (alternative : un
  fournisseur de tuiles avec un plan gratuit plus généreux comme MapTiler ou
  Stadia Maps, en ne changeant que l'URL de la couche de tuiles).
- **Aucune clé, aucun compte Google Maps Platform** n'est nécessaire à
  aucun endroit de cette fonctionnalité — objectif de départ respecté sur
  iOS, Android et web.
