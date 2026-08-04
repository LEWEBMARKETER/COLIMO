# Module Paiement — COLIMO

Paiement **manuel** des frais de livraison par Airtel Money (Phase 1).
**Aucun agrégateur, aucune API Airtel Money n'est connecté** — le client
envoie l'argent sur un numéro Airtel Money COLIMO, déclare son paiement, un
admin vérifie et valide manuellement. Module indépendant du reste de
l'application : les commandes ne connaissent que le résultat ("payé ou
non"), jamais comment.

```
Client / commerçant
      │
      ▼
initierPaiementManuel()  (packages/shared/src/paiements/service.ts)
      │
      ├── crée la ligne `paiements` (référence COL-XXXXXX générée en base)
      ├── fait passer la course en statut "en_attente_paiement"
      │   → invisible des coursiers tant que le paiement n'est pas confirmé
      ▼
Écran client : infos de paiement (numéro, titulaire, montant, référence)
      │
      ▼  "J'ai effectué le paiement"
declarerPaiement()  → statut "en_attente_validation"
      │
      ▼
Admin → Paiements → Paiements à valider
      │
      ├── validerPaiement()  → statut "paiement_confirme"
      │     └── la course repasse en "en_attente" (visible des coursiers,
      │         acceptée normalement — pas de moteur d'assignation
      │         automatique dans COLIMO, les coursiers acceptent eux-mêmes)
      │     └── notification "paiement_confirme" au client
      │
      └── rejeterPaiement()  → statut "paiement_rejete"
            └── notification "paiement_rejete" au client
            └── le client peut redéclarer un paiement (même ligne, ré-ouverte)
```

## Où se trouve le code

- `packages/shared/src/paiements/types.ts` — `StatutPaiementManuel`,
  `Paiement`, libellés
- `packages/shared/src/paiements/providers.ts` — `FournisseurPaiement`
  (interface swappable), `fournisseurManuelAirtelMoney` (fournisseur actif),
  `configurerFournisseurPaiement()`/`getFournisseurPaiement()`
- `packages/shared/src/paiements/service.ts` — `initierPaiementManuel`,
  `declarerPaiement`, `validerPaiement`, `rejeterPaiement`,
  `getPaiementParCourse`, `getPaiements` — seul endroit qui touche à la fois
  à la table `paiements` et au statut de la course (`patchCourse`)
- `apps/mobile/components/PaiementAirtelMoney.tsx` — écran client (infos +
  formulaire de déclaration), utilisé par `(client)/paiement/[courseId].tsx`
- `apps/mobile/app/(client)/track/[id].tsx` — bascule vers l'écran de
  paiement quand `course.statut === "en_attente_paiement"`
- `apps/admin/app/(dashboard)/paiements/page.tsx` — back-office (onglets
  "Paiements à valider" / "Historique", actions Valider/Rejeter)
- `supabase/migrations/0021_paiements_manuel.sql` — schéma (table
  `paiements`, statut `en_attente_paiement` sur `courses`)

## Pourquoi la course ne bouge pas toute seule dans le module des commandes

Le module des commandes (`packages/shared/src/supabase/queries.ts`,
`creerCourse`, `patchCourse`) ne contient **aucune logique de paiement**. La
décision "cette course doit attendre un paiement" est prise uniquement par
`initierPaiementManuel` (module paiements), qui appelle ensuite le
`patchCourse` générique déjà existant. Les coursiers ne voient jamais une
course en attente de paiement : leur tableau de bord ne charge que les
courses au statut `en_attente` (`getCourses({ zones, statut: "en_attente" })`)
— une fois le paiement confirmé, la course y réapparaît naturellement, sans
code supplémentaire côté coursier.

## Faire évoluer vers un vrai fournisseur (agrégateur / API Airtel Money)

1. Implémenter `FournisseurPaiement` (packages/shared/src/paiements/providers.ts)
   pour le nouveau fournisseur — a minima `obtenirInstructions()`.
2. Appeler `configurerFournisseurPaiement(nouveauFournisseur)` une fois au
   démarrage de l'app. Aucun écran n'a besoin de changer : ils passent tous
   par `getFournisseurPaiement()`.
3. Si le nouveau fournisseur confirme les paiements automatiquement
   (webhook, polling), écrire un point d'entrée qui appelle directement
   `validerPaiement`/`rejeterPaiement` (packages/shared/src/paiements/service.ts)
   à la place d'un clic admin — la logique de bascule de statut de course
   reste strictement identique.
4. La page admin "Paiements à valider" devient alors optionnelle (les
   paiements y arriveraient déjà confirmés) mais peut rester comme
   historique/contrôle.

## Numéro Airtel Money COLIMO

`COMPTE_AIRTEL_MONEY_COLIMO` (`packages/shared/src/paiements/providers.ts`)
contient le numéro et le titulaire réellement affichés aux clients — à
mettre à jour dans ce fichier si le numéro change.

## Statuts

| Statut | Déclenché par |
|---|---|
| `en_attente_paiement` | Course créée avec paiement Airtel Money — en attente que le client déclare avoir payé |
| `paiement_declare` | Réservé pour une granularité future (non utilisé aujourd'hui — la déclaration passe directement à "en attente de validation") |
| `en_attente_validation` | Client a rempli le formulaire "J'ai effectué le paiement" |
| `paiement_confirme` | Admin a validé |
| `paiement_rejete` | Admin a rejeté (motif optionnel) — le client peut redéclarer |
