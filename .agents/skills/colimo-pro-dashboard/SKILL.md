---
name: colimo-pro-dashboard
description: >
  Architecture des forfaits COLIMO PRO (Gratuit/Starter/Business) : calcul
  du forfait effectif, contrôle d'accès aux fonctionnalités premium,
  composants d'upsell. Utiliser avant d'ajouter une fonctionnalité réservée
  à un forfait, un écran de tableau de bord commerce, ou tout gating basé
  sur l'abonnement.
---

# COLIMO PRO Dashboard

## Le forfait effectif, jamais le champ brut

`calculerPlanEffectif(commercant)` (`packages/shared/src/abonnements/acces.ts`)
est la **seule** source de vérité pour le palier d'un commerce
(`gratuit`/`starter`/`business`). Ne jamais lire `commercant.subscriptionPlan`
directement : la fonction retombe sur `gratuit` si l'abonnement est
suspendu, si aucune date d'expiration n'est fixée, ou si elle est dépassée.
Un compte avec `subscriptionPlan = "starter"` mais un abonnement expiré
est **effectivement** gratuit — coder cette logique une seconde fois
ailleurs finit par diverger.

## Gating : toujours des deux côtés

`peutAccederFonctionnalite(planEffectif, cle)` +
`CATALOGUE_FONCTIONNALITES_PREMIUM` définissent quel palier débloque quelle
fonctionnalité. Une fonctionnalité premium doit être gardée **côté serveur**
(RLS ou vérification dans la RPC/route), jamais seulement par un `if` dans
l'interface — un bug de référence (« gating manquant sur
`statistiques.tsx` ») a laissé un compte Gratuit accéder au tableau de bord
avancé simplement parce que l'onglet était visible, sans second verrou
serveur. Toute nouvelle fonctionnalité Starter/Business ajoutée au
catalogue doit avoir sa propre vérification de forfait dans la couche
d'accès aux données, pas uniquement dans le composant d'écran.

## Upsell : un seul composant

`CarteUpsellPro` (prop `cle`, prop `pleinEcran` pour un verrou d'écran
entier) est le **seul** composant d'upsell. Ne pas construire un écran de
verrouillage personnalisé — passer la `cle` de la fonctionnalité concernée
(catalogue `CATALOGUE_FONCTIONNALITES_PREMIUM`) et laisser le composant
afficher le message, le prix et le CTA cohérents avec le reste de l'app.

## Fraîcheur du forfait affiché — lire aussi `colimo-mobile-ux`

Le tableau de bord commerce (`CommerceDashboard.tsx`, rendu dans l'onglet
Accueil) et `statistiques.tsx` sont des écrans d'**onglets persistants** :
ils ne se démontent jamais en changeant d'onglet. Un changement de forfait
effectué par l'admin pendant que l'app est déjà ouverte doit se refléter
**dès qu'on revient sur l'onglet** — ce qui exige `useFocusEffect`, pas un
`useEffect` classique (voir `colimo-mobile-ux` pour le patron complet et le
bug de référence corrigé en PR #51).

## Ne pas laisser une requête annexe bloquer le calcul du forfait

Le calcul du forfait dépend uniquement de `getMonCommerce()`. D'autres
requêtes du même écran (liste des coursiers pour « coursiers favoris »,
historique de courses...) peuvent échouer partiellement selon ce que la
RLS autorise le compte à voir — ne jamais les grouper avec
`getMonCommerce()` dans un seul `Promise.all` : un bug de référence
(`getCoursiers()` qui plantait pour un appelant non-admin, PR #52) a
empêché tout le lot de se résoudre, y compris le forfait, et l'écran
retombait sur l'affichage « gratuit » par défaut. Des requêtes
indépendantes (`.then()` séparés) isolent la panne à son seul widget.

## Catalogue des fonctionnalités par palier

Toujours ajouter/consulter une fonctionnalité premium dans
`packages/shared/src/abonnements/types.ts` (catalogue `CATALOGUE_FONCTIONNALITES_PREMIUM`)
— jamais coder en dur un `if (planEffectif === "starter")` dispersé dans un
composant sans passer par `peutAccederFonctionnalite`.

## Critères de validation

- [ ] Forfait lu via `calculerPlanEffectif()`, jamais `subscriptionPlan` brut
- [ ] Nouvelle fonctionnalité premium ajoutée au catalogue
      `CATALOGUE_FONCTIONNALITES_PREMIUM` avec vérification côté serveur
- [ ] Upsell via `CarteUpsellPro`, aucun écran de verrouillage personnalisé
- [ ] Écran d'onglet affichant le forfait → `useFocusEffect`, pas `useEffect` seul
- [ ] Requête du forfait jamais groupée dans un `Promise.all` avec une
      requête annexe pouvant échouer partiellement
