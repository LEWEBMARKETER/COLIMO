# Identité sonore des notifications

## Ce qui a été ajouté

Un motif sonore court et reconnaissable (trois notes ascendantes,
synthétisées via Web Audio API — aucun fichier audio à héberger,
`apps/mobile/lib/sonIdentite.ts`), joué **au premier plan** (app ouverte)
sur :

- **Toute nouvelle notification reçue** (`ClocheNotifications.tsx`,
  écoute Realtime déjà existante sur la table `notifications` — un
  écouteur `INSERT` dédié déclenche le son, distinct de l'écouteur `*`
  déjà utilisé pour rafraîchir le compteur non-lu).
- **Code de réception validé** par le coursier (`(coursier)/course/[id].tsx`).
- **Réception confirmée** par le client (`(client)/track/[id].tsx`).

Un seul motif partout : c'est la répétition à l'identique qui construit
une identité sonore reconnaissable, pas une variante par écran ou par
rôle.

## Pourquoi pas les notifications push (arrière-plan/app fermée)

Les navigateurs modernes (Chrome/Android en tête) ont retiré la prise en
charge d'un son personnalisé sur les notifications système. Un son fiable
n'est donc possible que lorsque l'app est ouverte — ce qui est le cas
implémenté ici. Aucune régression sur le système de push web existant
(`docs/NOTIFICATIONS_PUSH.md`), qui continue de fonctionner comme avant.

## Réglage utilisateur

Interrupteur **"Son des notifications"** ajouté dans `ParametresCompte.tsx`
(bloc réutilisé par les écrans Profil client et coursier) — activé par
défaut, préférence persistée en `localStorage` (par appareil/navigateur,
comme la bannière d'activation des notifications push existante).

## Fichiers modifiés/ajoutés

**Nouveau** : `apps/mobile/lib/sonIdentite.ts`

**Modifiés** :
- `apps/mobile/components/ClocheNotifications.tsx`
- `apps/mobile/components/ParametresCompte.tsx`
- `apps/mobile/app/(coursier)/course/[id].tsx`
- `apps/mobile/app/(client)/track/[id].tsx`

## Limite connue

La lecture d'un son via Web Audio API nécessite qu'un geste utilisateur
ait déjà eu lieu sur la page dans la session en cours (politique
autoplay des navigateurs) — dans une app où toute navigation passe par
des taps/clics, c'est le cas dès les premières secondes d'utilisation.
Aucune action supplémentaire requise côté utilisateur.
