# Géolocalisation temps réel des coursiers

Suivi GPS du coursier pendant une course active, calcul automatique de la
distance restante et de l'ETA, et affichage en temps réel côté client,
destinataire (sans compte) et admin.

## Principes retenus

- **La position n'est transmise que pendant une course active**
  (`acceptee`/`retrait`/`en_cours`) : l'app coursier ne démarre le suivi GPS
  que sur l'écran de la course en cours
  (`apps/mobile/app/(coursier)/course/[id].tsx`), et l'arrête dès que la
  course sort de cet ensemble (livrée, confirmée, annulée). Rien n'est
  jamais transmis en arrière-plan hors course.
- **Une seule ligne de position par coursier** (`positions_coursiers`),
  écrasée à chaque mise à jour — pas un historique de trajet.
- **Le calcul distance/ETA (Mapbox Directions, payant) est fait côté
  serveur** et mis en cache sur `courses` (`distance_restante_m`,
  `eta_secondes`, `eta_calcule_at/lat/lng`, `eta_source`) : l'app peut
  demander un recalcul après chaque position GPS, le serveur décide seul si
  un appel Mapbox est réellement nécessaire (throttle), donc jamais "à
  chaque position GPS" côté facturation.
- **Aucune clé Mapbox secrète dans le frontend.** Le rendu de carte utilise
  un token **public** Mapbox (`pk.*`, normal et documenté par Mapbox
  lui-même pour l'affichage de tuiles) exposé via `EXPO_PUBLIC_MAPBOX_TOKEN`
  / `NEXT_PUBLIC_MAPBOX_TOKEN`. Le token **secret** (`sk.*`, utilisé pour
  Directions) reste exclusivement dans `MAPBOX_SECRET_TOKEN`, une variable
  d'environnement serveur (Vercel), lue uniquement par
  `apps/mobile/api/mapbox/directions.ts`.
- **Mode dégradé** à deux niveaux : si Mapbox Directions échoue, le serveur
  retombe sur une estimation à vol d'oiseau (Haversine, déjà utilisée pour
  le tarif) ; si le script Mapbox GL JS ne charge pas côté carte (CDN
  inaccessible, token invalide), le composant carte retombe automatiquement
  sur Leaflet/OpenStreetMap (gratuit, sans clé, déjà utilisé partout dans
  l'app avant cette fonctionnalité).
- **Le destinataire sans compte** garde son lien de suivi en lecture seule,
  désormais identifié par un code court lisible plutôt qu'un jeton uuid —
  cf. section dédiée ci-dessous.

## Ce que voit chaque profil

- **Coursier** (`(coursier)/course/[id].tsx`) : transmet sa position toutes
  les ~12s ou après ~30m de déplacement (`watchPositionAsync`), voir son
  itinéraire vers le point de récupération puis la destination
  (`CarteItineraire`), déclenche le recalcul ETA après chaque position.
- **Client** (`(client)/track/[id].tsx`) : voit le coursier en direct sur la
  carte (abonnement Supabase Realtime à `positions_coursiers`, filtré sur
  son coursier), avec distance restante et ETA affichés dès qu'une position
  est disponible.
- **Destinataire sans compte** (`/suivi/[code]`) : statut, position du
  coursier, distance restante et ETA uniquement — jamais le prix, le mode
  de paiement, ni d'autres données sensibles (déjà garanti par
  `get_course_suivi_public`, étendu sans élargir son périmètre). Le
  rafraîchissement reste en polling (3s, comme avant) plutôt qu'en Realtime :
  un accès anonyme ne peut pas s'authentifier auprès de Realtime/RLS, la
  fonction `security definer` reste le seul point d'entrée public.
- **Admin** (`/carte`, nouvelle page) : carte des coursiers actuellement en
  course (position live), compteurs disponibles/en course/hors ligne, et un
  premier survol des zones desservies (cercles indicatifs autour de
  `CENTRES_ZONES` — pas encore de vrais contours, à affiner plus tard).

## Base de données (`supabase/migrations/0038_geolocalisation_coursiers.sql`)

1. `positions_coursiers` (une ligne par coursier) + RLS (coursier sur sa
   propre ligne, admin, client avec course active assignée) + ajout à la
   publication `supabase_realtime`.
2. `courses.code_suivi` (ex. `CLM-X7P4-K92M`, généré automatiquement à
   l'insertion, unique) — remplace `token_suivi` comme identifiant utilisé
   par l'application pour le lien public (`token_suivi` reste en base,
   inutilisé désormais).
3. `courses.distance_restante_m` / `eta_secondes` / `eta_calcule_at` /
   `eta_calcule_lat` / `eta_calcule_lng` / `eta_source`, verrouillées comme
   `prix`/`coursier_id` (cf. 0028) : seule la fonction serveur (clé service
   role) ou un admin peut les modifier.
4. `geocodages_cache` (cache Mapbox Geocoding, réservé au service role —
   prêt pour un usage futur, pas encore branché sur la saisie d'adresse qui
   reste sur Nominatim, gratuite).
5. `mapbox_usage` (compteur d'appels par type/jour, lisible par l'admin).
6. `get_course_suivi_public` : désormais `get_course_suivi_public(p_code
   text)`, enrichie de la position du coursier (uniquement pendant une
   course active) et de la distance/ETA en cache.

**À appliquer manuellement dans Supabase SQL Editor** (comme toutes les
migrations de ce projet) : coller le contenu de
`supabase/migrations/0038_geolocalisation_coursiers.sql`.

## Configuration Mapbox à faire manuellement

1. Créer un compte sur [mapbox.com](https://www.mapbox.com) si ce n'est pas
   déjà fait, puis dans **Account > Tokens** :
   - le **token par défaut** (`pk.*`) sert de token public — restreignez-le
     si possible aux domaines `colimo.online` et `*.vercel.app` (URL
     restrictions Mapbox) ;
   - créez un **second token secret** (`sk.*`, scope `Styles:Read` +
     `Directions` suffit) pour les appels serveur.
2. Dans Vercel, projet **colimo-mobile** (Settings > Environment
   Variables), ajouter :
   - `EXPO_PUBLIC_MAPBOX_TOKEN` = le token public `pk.*` (côté client, sans
     risque — c'est l'usage normal d'un token Mapbox public)
   - `MAPBOX_SECRET_TOKEN` = le token secret `sk.*` (côté serveur
     uniquement, jamais préfixé `EXPO_PUBLIC_`)
   - `SUPABASE_SERVICE_ROLE_KEY` si ce n'est pas déjà fait pour ce projet
     (déjà utilisée par `apps/admin` — même clé, à ajouter ici aussi car
     `apps/mobile/api/mapbox/directions.ts` en a besoin pour écrire le
     résultat du calcul ETA).
3. Dans Vercel, projet **colimo-admin**, ajouter `NEXT_PUBLIC_MAPBOX_TOKEN`
   = le même token public, pour la page **Carte en direct**.
4. Redéployer les deux projets après ajout des variables (un redéploiement
   normal suffit, pas besoin de vider le cache).

Sans ces variables, tout continue de fonctionner en mode dégradé : carte
Leaflet/OpenStreetMap, ETA en estimation à vol d'oiseau — rien ne casse,
seule la précision et le rendu Mapbox sont absents tant que les tokens ne
sont pas configurés.

## Optimisation des coûts

- Position GPS : throttle natif `watchPositionAsync` (temps **et**
  distance), pas de polling manuel.
- ETA : throttle autoritaire côté serveur
  (`packages/shared/src/positions` — `doitRecalculerEta`), au minimum 10s
  entre deux calculs, au maximum 45s sans recalcul si le coursier ne bouge
  pas significativement (200m), jamais un appel Mapbox par position GPS
  reçue.
- Compteur `mapbox_usage` (par type d'appel et par jour) pour surveiller la
  dérive de coût depuis l'admin (accès direct SQL pour l'instant — une page
  dédiée pourra être ajoutée plus tard si besoin).
- Cache de géocodage prêt (`geocodages_cache`) mais pas branché sur la
  recherche d'adresse actuelle (Nominatim, gratuite) — pour éviter un coût
  Mapbox là où l'existant fonctionne déjà bien.

## Vérifications effectuées

- `pnpm --filter @colimo/shared typecheck`,
  `--filter @colimo/mobile typecheck`, `--filter @colimo/admin typecheck` :
  OK.
- `expo export -p web` (build complet du bundle web) : OK.

**Non testé en conditions réelles** (nécessite la migration 0038 appliquée
et les tokens Mapbox configurés) — à valider par l'utilisateur :

- Créer une course, l'accepter côté coursier, vérifier que la position
  apparaît côté client (`track/[id].tsx`) et sur le lien de suivi public
  (`/suivi/CLM-...`) pendant que le coursier se déplace.
- Vérifier que la distance/ETA se met à jour progressivement, sans appel
  Mapbox à chaque position (observable via `mapbox_usage`).
- Vérifier que la position disparaît une fois la course confirmée/annulée.
- Vérifier la carte **Carte en direct** côté admin avec au moins un coursier
  en course.
- Retirer temporairement `EXPO_PUBLIC_MAPBOX_TOKEN` pour confirmer le repli
  automatique sur Leaflet/OpenStreetMap.
