# Onglet Support (client + coursier)

## Audit préalable

Aucune fonctionnalité de contact/support n'existait avant ce changement
(seules quelques mentions textuelles "Contactez le support COLIMO", sans
lien ni écran). Le Communication Center existant
(`packages/shared/src/communication`) a été délibérément **laissé de
côté** pour ce besoin : il envoie des notifications templatées DE Colimo
VERS un utilisateur pour des événements de plateforme (course créée,
litige ouvert...) — l'inverse exact de ce qui est demandé ici (un message
libre écrit par l'utilisateur, envoyé VERS la boîte support). Le
réutiliser aurait forcé un mauvais café dans un système pensé pour autre
chose ; une route serveur dédiée, plus simple, a été préférée.

## Ce qui a été ajouté

- **Nouvel onglet "Support"** dans le footer (Tabs) client ET coursier
  (5ᵉ onglet, entre les onglets existants et "Profil") — un seul
  composant partagé (`components/EcranSupport.tsx`), deux fichiers de
  route minces (`(client)/(tabs)/support.tsx`, `(coursier)/(tabs)/support.tsx`)
  qui ne font que le monter, pour éviter toute duplication de logique.
- **WhatsApp** : numéro affiché + bouton "Contacter sur WhatsApp"
  ouvrant `wa.me` avec un message prérempli.
- **Email** : adresse affichée et cliquable (`mailto:`), plus un
  formulaire (Nom complet, Email, Objet, Message) envoyé via une route
  serveur dédiée (`apps/mobile/api/support/contact.ts`), qui envoie un
  email réel par SMTP (`nodemailer`) — les identifiants SMTP ne vivent
  que côté serveur (variables d'environnement Vercel), jamais exposés au
  frontend.
- **Préremplissage** : pour un utilisateur connecté, Nom et Email sont
  préremplis (nom/prénom du profil `utilisateurs`, email tiré de la
  session Supabase Auth — `email` n'existe pas dans `public.utilisateurs`,
  seulement dans `auth.users`).
- **Validations** : champs requis, format email, longueurs maximales —
  côté client (désactivation du bouton) ET côté serveur (jamais confiance
  dans la seule validation frontend, cohérent avec le reste du projet).
- **États** : chargement (bouton avec spinner), succès (message vert,
  formulaire réinitialisé), erreur (message rouge avec la cause réelle
  renvoyée par le serveur quand disponible).

## Ce qui n'a pas été touché

Authentification, COLIMO PRO, Communication Center, tous les autres
onglets/écrans : aucune modification.

## Variables d'environnement à configurer manuellement (Vercel, colimo-mobile)

| Variable | Rôle |
|---|---|
| `SUPPORT_SMTP_HOST` | Hôte du serveur SMTP à utiliser pour l'envoi. |
| `SUPPORT_SMTP_PORT` | Port SMTP (587 par défaut ; 465 bascule automatiquement en connexion sécurisée). |
| `SUPPORT_SMTP_USER` | Identifiant SMTP (aussi utilisé comme adresse d'expédition). |
| `SUPPORT_SMTP_PASSWORD` | Mot de passe/clé SMTP — **secret**, jamais exposé au frontend. |
| `SUPPORT_EMAIL_DESTINATAIRE` | Optionnel, défaut `contact@colimo.online` — boîte qui reçoit les demandes. |

Sans ces variables, le formulaire répond une erreur claire ("non
configuré côté serveur") plutôt que d'échouer silencieusement — WhatsApp
et le lien `mailto:` restent utilisables dans tous les cas, indépendamment
de cette configuration.

## Fichiers modifiés/ajoutés

**Nouveaux** :
- `apps/mobile/api/support/contact.ts`
- `apps/mobile/components/EcranSupport.tsx`
- `apps/mobile/app/(client)/(tabs)/support.tsx`
- `apps/mobile/app/(coursier)/(tabs)/support.tsx`

**Modifiés** :
- `apps/mobile/lib/api.ts` (`envoyerDemandeSupport`)
- `apps/mobile/app/(client)/(tabs)/_layout.tsx`, `apps/mobile/app/(coursier)/(tabs)/_layout.tsx` (nouvel onglet)
- `apps/mobile/package.json` (ajout de `nodemailer`)

## Tests manuels

- [ ] L'onglet "Support" apparaît dans le footer, pour un compte client (particulier et commerce) et pour un compte coursier.
- [ ] Bouton WhatsApp : ouvre `wa.me` avec le message prérempli.
- [ ] Lien email : ouvre le client mail par défaut vers `contact@colimo.online`.
- [ ] Utilisateur connecté : Nom et Email déjà remplis à l'ouverture de l'onglet.
- [ ] Formulaire incomplet ou email invalide : bouton "Envoyer ma demande" désactivé.
- [ ] Envoi réussi (SMTP configuré) : message de succès, email reçu sur la boîte support avec le bon expéditeur/reply-to.
- [ ] SMTP non configuré : message d'erreur clair, pas de crash.
- [ ] `pnpm --filter @colimo/mobile typecheck` et `expo export -p web` (les deux passent).

⚠️ Non vérifiable dans cet environnement (aucun accès réseau/Supabase live) :
le rendu réel de l'onglet dans un navigateur, et l'envoi effectif d'un
email via un vrai SMTP.
