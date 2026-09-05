# Paiement mobile money automatisé (scaffold)

Architecture prête à brancher un vrai fournisseur (Airtel Money/Moov Money)
pour confirmer automatiquement un paiement, **sans identifiants API
disponibles à ce jour dans cet environnement**. Le flux manuel existant
(déclaration client + validation admin, `supabase/migrations/0021_paiements_manuel.sql`)
reste le comportement **par défaut et inchangé** — rien de ce qui suit ne
s'active tant qu'un admin n'a pas explicitement basculé la configuration.

## Ce qui est réellement fonctionnel dès maintenant

- Le schéma de base (`supabase/migrations/0040_paiement_automatique_scaffold.sql`) :
  colonnes `paiements.transaction_externe_id`/`mode`, table
  `configuration_paiements_automatiques` (bascule unique, admin uniquement),
  table `webhooks_paiement` (journal brut), fonction
  `confirmer_paiement_automatique` (même transition que `validerPaiement` :
  paiement confirmé + la course redevient `en_attente`).
- Le panneau admin (`/paiements`, section "Paiement automatique") : activer/
  désactiver, choisir le fournisseur, consulter le journal des webhooks
  reçus.
- L'endpoint `apps/mobile/api/paiements/webhook.ts` : journalise chaque
  appel, vérifie un secret partagé, confirme le paiement via la fonction ci-
  dessus si la configuration est active et le corps de requête complet.

## Ce qui reste à faire une fois de vrais identifiants disponibles

1. **Obtenir un accès API** Airtel Money/Moov Money (ou un agrégateur type
   CinetPay/PayGate qui unifie les deux) — accord commercial, identifiants
   marchand, documentation de leur API.
2. **Adapter le webhook** : le fournisseur envoie presque certainement son
   propre format de corps de requête et son propre mécanisme de signature
   (HMAC, la plupart du temps) — pas le secret partagé simpliste utilisé ici
   en attendant. Ajoutez un petit adaptateur en tête de
   `apps/mobile/api/paiements/webhook.ts` qui convertit leur payload réel
   vers `CorpsWebhookNormalise` et vérifie leur signature, sans réécrire le
   reste (journalisation, idempotence, mise à jour de la course déjà
   corrects).
3. **Implémenter `initierPaiementAutomatique`** sur un nouveau
   `FournisseurPaiement` (`packages/shared/src/paiements/providers.ts`) —
   déclenche la demande de paiement (STK push) côté fournisseur, puis
   appeler `configurerFournisseurPaiement(...)` une fois au démarrage de
   l'app pour le rendre actif (aucun autre fichier à modifier).
4. **Variables d'environnement Vercel** (projet colimo-mobile) :
   - `PAIEMENT_WEBHOOK_SECRET` (secret partagé provisoire — à remplacer par
     la vérification de signature réelle du fournisseur)
   - les identifiants du fournisseur lui-même (jamais stockés en base)
5. **Activer** depuis `/paiements` (admin) une fois tout ce qui précède en
   place — bascule immédiate, réversible à tout moment sans perte de
   données (le flux manuel redevient actif si on désactive).

## Sécurité

- Les identifiants fournisseur ne sont jamais en base de données — seul un
  booléen `actif` + le nom du fournisseur choisi.
- `confirmer_paiement_automatique` n'est exécutable que par la clé service
  role (jamais par un client), et est idempotente (un webhook rejoué avec
  le même `transaction_externe_id` ne fait rien de plus).
- Chaque appel webhook est journalisé (`webhooks_paiement`), traité ou non,
  avec l'erreur éventuelle — indispensable pour diagnostiquer une
  intégration qui n'aura jamais été testée en conditions réelles avant sa
  mise en service.

## Vérifications effectuées

- `pnpm --filter @colimo/shared typecheck`, `--filter @colimo/mobile typecheck`,
  `--filter @colimo/admin typecheck` : OK.

**Non testable en conditions réelles dans cet environnement** (nécessite un
vrai fournisseur mobile money) — à valider par l'utilisateur une fois les
identifiants obtenus, en suivant les 5 étapes ci-dessus.
