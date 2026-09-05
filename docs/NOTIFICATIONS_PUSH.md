# Notifications push web (PWA)

Notifications navigateur en temps réel (même app fermée), via Service
Worker + Web Push standard (clés VAPID) — aucun service tiers propriétaire
(pas de Firebase Cloud Messaging). S'ajoute au canal "push" déjà existant du
Communication Center (in-app, cloche/`EcranNotifications`) **sans le
remplacer** : chaque événement `notification_*` continue d'être enregistré
dans `notifications` comme avant, et déclenche désormais **en plus** un vrai
push navigateur si le destinataire y est abonné sur au moins un appareil.

## Pourquoi c'était nécessaire

Sans ceci, un client/coursier ne voyait une mise à jour de statut que s'il
avait l'app ouverte (ou via WhatsApp/SMS, canaux pas encore réellement
branchés — cf. `docs/COMMUNICATION_CENTER.md`). C'est un vrai trou de
fiabilité perçue indépendant des fonctionnalités elles-mêmes.

## Architecture

1. **Abonnement** (`apps/mobile/lib/push.ts`, `activerNotificationsPush`) :
   demande la permission navigateur, enregistre `public/sw.js`, s'abonne via
   `PushManager`, persiste l'abonnement (`push_subscriptions`, RLS "own
   only"). Déclenché uniquement par un geste explicite de l'utilisateur
   (bandeau "Activer les notifications" sur l'accueil client/commerce et le
   dashboard coursier — jamais automatiquement).
2. **Service Worker** (`apps/mobile/public/sw.js`) : affiche la notification
   reçue, ouvre/reprend le focus sur l'app au clic.
3. **Envoi** (`apps/mobile/api/push/envoyer.ts`) : fonction serveur (clé
   service role + clé privée VAPID, jamais côté client) qui lit les
   abonnements de l'utilisateur ciblé et envoie via `web-push`. Supprime
   automatiquement un abonnement expiré/révoqué (404/410).
4. **Branchement** (`apps/mobile/lib/pushProvider.ts`) : remplace le
   `MockPushProvider` par défaut du Communication Center par un vrai
   fournisseur qui appelle l'endpoint ci-dessus — un seul appel à
   `configurerFournisseurPush(...)` au démarrage de l'app web
   (`app/_layout.tsx`), aucun autre fichier à changer. Tous les événements
   `notification_*` déjà câblés dans l'app (livraison créée, coursier
   attribué, colis récupéré, litige, abonnement...) en bénéficient
   immédiatement, sans modification de leurs points d'appel.

## Migration à appliquer

`supabase/migrations/0041_notifications_push_web.sql` : table
`push_subscriptions` + RLS (un utilisateur ne gère que ses propres
abonnements).

## Configuration Vercel à faire manuellement

Une paire de clés VAPID **réelle** a été générée pour ce projet (aucune
donnée personnelle, ne concerne que le chiffrement Web Push) :

- **Clé publique** (`EXPO_PUBLIC_MAPBOX_TOKEN`-like, sans risque à exposer
  côté client — c'est son usage normal) :
  ```
  BCRk29w2NdNuFbHhQK0beTSQLVfZ56JXBxThkSHT7Kb-qLRdiVGKJvXtw2_PBrQTYJptP6N_Bjmb4VKcTdadIJE
  ```
- **Clé privée** (jamais côté client, à garder secrète comme n'importe quelle
  clé serveur) :
  ```
  X9TgsGkjLqfHleEA3oyEhkxQQRFamL4gA4nr3wbUPSI
  ```

Sur Vercel, projet **colimo-mobile** → Settings → Environment Variables :

| Nom | Valeur | Type |
|---|---|---|
| `EXPO_PUBLIC_VAPID_PUBLIC_KEY` | la clé publique ci-dessus | Config |
| `VAPID_PRIVATE_KEY` | la clé privée ci-dessus | Secret |
| `VAPID_SUBJECT` | `mailto:contact@colimo.online` (ou une adresse réelle que vous surveillez — exigé par le protocole Web Push, jamais affiché à l'utilisateur) | Config ou Secret, peu importe |

Puis redéployer colimo-mobile. Si ces variables sont absentes, le bandeau
d'activation ne s'affiche simplement jamais (comportement dégradé sans
erreur) — rien ne casse.

## Sécurité

- La clé privée VAPID ne quitte jamais `apps/mobile/api/push/envoyer.ts`.
- Un abonnement n'est lisible/supprimable que par son propriétaire (RLS) ;
  seule la fonction serveur (clé service role) peut lire les abonnements
  d'un tiers, pour lui envoyer une notification à l'occasion d'un
  événement métier légitime (ex. le client notifie le coursier assigné).
- L'endpoint d'envoi exige une session authentifiée valide (n'importe quel
  compte COLIMO) — pas de vérification fine de "qui a le droit de notifier
  qui" au-delà de ça, comme pour les autres canaux du Communication Center.

## Vérifications effectuées

- `pnpm --filter @colimo/shared typecheck`, `--filter @colimo/mobile typecheck`,
  `--filter @colimo/admin typecheck` : OK.
- `expo export -p web` : OK.

**Non testé en conditions réelles** (nécessite la migration appliquée + les
clés VAPID configurées sur Vercel) — à valider par l'utilisateur : activer
les notifications depuis le bandeau, déclencher un événement (ex. accepter
une course), vérifier la réception d'une notification navigateur même
onglet/app fermé.
