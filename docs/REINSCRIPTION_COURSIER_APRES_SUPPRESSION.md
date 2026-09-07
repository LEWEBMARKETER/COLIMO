# Réinscription d'un coursier 24h après suppression par un admin

## Besoin

Quand un administrateur supprime définitivement un compte coursier, ce
dernier doit pouvoir, s'il le souhaite, recréer un nouveau compte 24
heures après la suppression.

## Ce qui existait déjà

- La suppression de compte (`apps/admin/app/api/utilisateurs/[id]/route.ts`,
  générique à tout type de compte) tente déjà une suppression réelle
  (Auth + cascade DB), et bascule sur anonymisation + bannissement Auth
  définitif si le compte a le moindre historique (courses, paiements...).
- `historique_suppressions_compte` (0036) journalisait déjà, dans les
  **deux** cas, le téléphone d'origine et l'horodatage de la suppression —
  la donnée nécessaire au garde-fou de 24h existait déjà, rien à dupliquer.
- Le téléphone réel était déjà libéré immédiatement en base
  (`utilisateurs.telephone` repasse à `supprime-<uuid>`, et ce champ est
  `unique`) : rien n'empêchait déjà une réinscription immédiate côté DB.

## Ce qui manquait (deux vrais gaps corrigés ici)

1. **L'email Auth n'était jamais libéré.** Le bannissement (`ban_duration`
   ~100 ans) empêche le compte banni de se reconnecter, mais ne change ni
   ne libère son email — Supabase Auth exige un email unique par projet.
   Un coursier anonymisé ne pouvait donc **jamais** recréer de compte avec
   le même email, même après n'importe quel délai. Corrigé : l'email
   réel est maintenant remplacé par un placeholder
   (`supprime-<uuid>@colimo-supprime.invalid`) au moment de l'anonymisation,
   libérant l'email d'origine pour une future inscription.
2. **Aucun garde-fou de 24h n'existait** — une fois le téléphone/email
   libérés, rien n'empêchait une réinscription immédiate. Un nouveau
   trigger (`supabase/migrations/0044_reinscription_coursier_apres_suppression.sql`)
   bloque désormais toute inscription `type = 'coursier'` dont le
   téléphone correspond à une suppression de compte coursier enregistrée
   dans `historique_suppressions_compte` il y a moins de 24h — qu'il
   s'agisse d'une suppression réelle ou d'une anonymisation, les deux
   modes y sont déjà journalisés.

## Pourquoi 24h seulement, pas définitivement

C'est exactement la demande : la suppression admin doit rester
définitive pour le compte lui-même (historique conservé si applicable,
connexion coupée immédiatement), mais ne doit pas empêcher la personne de
revenir sur la plateforme avec un nouveau compte après un court délai —
un garde-fou anti-abus (empêcher une réinscription instantanée pour
échapper à une suspension en cours), pas une interdiction permanente.

## Fichiers modifiés/ajoutés

**Nouveau** : `supabase/migrations/0044_reinscription_coursier_apres_suppression.sql`

**Modifiés** :
- `apps/admin/app/api/utilisateurs/[id]/route.ts` (libération de l'email Auth, journalisation `email_original`)
- `packages/shared/src/comptes/types.ts`, `src/supabase/mappers.ts` (champ `emailOriginal`)
- `apps/mobile/app/(auth)/register-coursier.tsx` (affiche le message d'erreur réel du serveur — "supprimé récemment" — au lieu d'un message générique)

## Migration à appliquer

`supabase/migrations/0044_reinscription_coursier_apres_suppression.sql` (SQL Editor Supabase, après 0043).

## Tests manuels

- [ ] Supprimer définitivement un coursier sans historique (suppression réelle) : tenter de recréer un compte coursier avec le même téléphone/email immédiatement → bloqué avec message "supprimé récemment".
- [ ] Attendre 24h (ou réduire temporairement l'intervalle en base pour tester) : la réinscription avec le même téléphone fonctionne.
- [ ] Supprimer un coursier avec historique (anonymisation) : vérifier que l'email réel n'apparaît plus sur le compte anonymisé (remplacé par le placeholder), puis répéter le test ci-dessus.
- [ ] Vérifier qu'un client supprimé n'est pas concerné par ce garde-fou (peut se réinscrire librement, comme avant).
