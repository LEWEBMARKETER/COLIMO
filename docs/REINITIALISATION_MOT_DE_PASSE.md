# Réinitialisation du mot de passe — COLIMO

Parcours complet "mot de passe oublié" pour les comptes déjà enregistrés
(client, coursier — email/mot de passe, Supabase Auth). N'utilise que les
mécanismes natifs de Supabase Auth : aucune table, aucune colonne, aucune
migration nécessaire, aucun compte recréé.

## Parcours

1. `(auth)/login.tsx` — lien "Mot de passe oublié ?" sous le formulaire →
   `/(auth)/forgot-password`.
2. `(auth)/forgot-password.tsx` — saisie de l'email, validation de format
   côté client, puis `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
   **Toujours** le même message de confirmation générique après l'envoi
   ("Si un compte COLIMO est associé à cette adresse...") — Supabase ne
   révèle jamais si l'adresse correspond à un compte, et le code ne fait
   aucune vérification d'existence de son côté non plus (anti-énumération).
3. L'utilisateur clique le lien reçu par e-mail → arrive sur
   `/reset-password` avec un jeton de récupération dans l'URL. Le client
   Supabase le détecte automatiquement (`detectSessionInUrl`, activé par
   défaut) et établit une session de récupération temporaire, ce qui
   déclenche l'événement `PASSWORD_RECOVERY`.
4. `(auth)/reset-password.tsx` — écoute cet événement (+ un filet de
   sécurité `getSession()` si l'événement a déjà été émis avant l'abonnement,
   + un délai de 3s au-delà duquel le lien est considéré invalide/expiré),
   affiche le formulaire (nouveau mot de passe + confirmation), valide
   (correspondance, ≥ 8 caractères, une lettre, un chiffre — `packages/shared/src/motDePasse`),
   puis `supabase.auth.updateUser({ password })`. Déconnecte ensuite la
   session de récupération (`signOut`) et propose "Se connecter à COLIMO"
   → `/login`, pour forcer une connexion volontaire avec le nouveau mot de
   passe.

## `redirectTo` — résolu dynamiquement, jamais codé en dur

```ts
const origine = typeof window !== "undefined" ? window.location.origin : "https://colimo.online";
supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origine}/reset-password` });
```

Fonctionne automatiquement en production (`https://colimo.online/reset-password`),
sur un déploiement Vercel de preview, et en local (`http://localhost:8081/reset-password`
ou le port du serveur web Expo) — sans distinguer les environnements dans le
code. Aucune URL `*.vercel.app` n'était codée en dur nulle part dans le
projet (vérifié).

## ⚠️ Configuration manuelle requise (dashboard Supabase, ne peut pas être faite depuis le code)

Dashboard Supabase → **Authentication → URL Configuration** :

- **Site URL** : `https://colimo.online`
- **Redirect URLs** — ajouter (une par ligne) :
  - `https://colimo.online/reset-password`
  - `https://colimo-mobile.vercel.app/reset-password` (utile pour tester un
    déploiement de preview Vercel)
  - `http://localhost:8081/reset-password` (ou le port réellement utilisé
    par `expo start --web` en local, si vous testez ce parcours en dev)

Sans cette déclaration, Supabase refuse le `redirectTo` demandé et retombe
sur la Site URL — le lien reçu par e-mail n'atterrirait alors pas sur l'écran
de nouveau mot de passe.

## Sécurité

- Aucune donnée de profil (`utilisateurs`) n'est lue ni modifiée par ce
  parcours — uniquement `auth.users` via les méthodes Supabase Auth
  natives (`resetPasswordForEmail`, `updateUser`).
- Le mot de passe n'est jamais stocké ailleurs que dans Supabase Auth
  (jamais en base applicative, jamais en `localStorage`).
- Aucune clé service-role nécessaire — tout se fait avec la clé publique
  (`anon`), déjà utilisée par le reste de l'app mobile.
- Anti-énumération : le message après la demande est systématiquement
  générique, que le compte existe ou non.

## Vérification effectuée

- `pnpm --filter @colimo/shared typecheck`, `--filter @colimo/mobile typecheck` : OK
- `pnpm --filter @colimo/mobile build:web` (906 modules, +3 vs avant ce
  parcours) : OK

**Non testé en conditions réelles** (nécessite la configuration des
Redirect URLs ci-dessus dans Supabase) — à valider par l'utilisateur :
connexion → mot de passe oublié → réception de l'e-mail → lien → nouveau
mot de passe → connexion avec le nouveau mot de passe, sur un compte
client et un compte coursier, ainsi que le cas d'un lien expiré/déjà
utilisé (doit afficher l'écran "Lien invalide ou expiré").
