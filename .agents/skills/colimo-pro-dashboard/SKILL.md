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

## Mission

Le tableau de bord commerce doit se comprendre en moins de 10 secondes.
Réel (`CommerceDashboard.tsx`, onglet Accueil) : en-tête « Bonjour
{nom} 👋 » + « Vue d'ensemble du jour » + `BadgeAbonnement` (palier
affiché), puis 3 `CarteAction` (« Livrer une commande », « Suivre une
course », « Mes livraisons »), puis les KPIs du jour (`ChiffreCle`
« Dépenses du jour » + compteurs Livraisons/En cours/Terminées), puis
les dernières livraisons et les coursiers favoris (Business uniquement,
sinon un top-3 informel par fréquence). Ne pas restructurer cet écran
sans raison démontrée — c'est déjà l'architecture recommandée
(identité + action + chiffres + activité récente).

**Nuance avec le générique** : les 4 KPIs réels sont Dépenses du jour /
Livraisons du jour / En cours / Terminées, pas « Courses aujourd'hui / En
cours / Livrées / À confirmer » du document générique — pas de compteur
« à confirmer » sur le tableau de bord commerce aujourd'hui (le filtre
« à confirmer » existe côté **admin**, voir `colimo-delivery-flow` /
validation administrative, pas côté commerce). Ne pas ajouter ce
4e KPI sans un besoin explicite, et si ajouté, respecter la limite de 4
KPIs au-dessus de la ligne de flottaison déjà en place.

## Header

`BadgeAbonnement` affiche déjà le palier (`planEffectif`, jamais le champ
brut — voir section suivante) avec une alerte inline si l'abonnement
expire sous 7 jours (`abonnementExpireBientot`). Le CTA principal réel est
« Livrer une commande » (`CarteAction`), pas un bouton « Nouvelle
livraison » isolé dans l'en-tête — ne pas dupliquer ce CTA à deux
endroits de l'écran.

## Actions rapides

Réel : 3 `CarteAction` fixes (Livrer une commande / Suivre une course /
Mes livraisons), pas une liste qui varie selon le forfait. Les actions
génériques « Programmer » et « Importer » existent mais **ailleurs** dans
le parcours, pas comme raccourcis du tableau de bord : la programmation
d'une course est une option du formulaire de création
(`packages/shared/src/programmation`, disponible à tout palier — pas
réservée à Starter/Business), et l'import (`commandes_masse`, Business
uniquement) est une fonctionnalité de `nouvelle-livraison.tsx`, pas un
raccourci du dashboard. Si un raccourci direct vers l'import est ajouté
pour Business, le masquer via `peutAccederFonctionnalite`, pas un lien
toujours visible.

## Courses actives

Les statuts prioritaires à surfacer (retrait/en_cours/livree/litige)
correspondent aux statuts réels de `course_status` — voir
`colimo-delivery-flow` pour la liste complète et la règle de non-
duplication de statut. Le filtre « à confirmer » (statut `livree` en
attente de confirmation) est déjà construit côté admin
(`courses/page.tsx`) ; le répliquer côté commerce si demandé, en
réutilisant le même statut, pas une nouvelle valeur.

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

## Upsell : un seul composant, jamais de blocage brutal

`CarteUpsellPro` (prop `cle`, prop `pleinEcran` pour un verrou d'écran
entier) est le **seul** composant d'upsell. Ne pas construire un écran de
verrouillage personnalisé — passer la `cle` de la fonctionnalité concernée
(catalogue `CATALOGUE_FONCTIONNALITES_PREMIUM`) et laisser le composant
afficher le message, le prix et le CTA cohérents avec le reste de l'app :
nommer la fonctionnalité, expliquer le bénéfice concret en une phrase,
proposer un CTA vers l'offre — jamais un simple « Fonctionnalité
verrouillée » sans contexte. Ne pas réduire ce contenu à un message
générique en réutilisant le composant dans un nouvel écran.

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

**Contenu réel du catalogue** (source de vérité, ne pas se fier à une
liste générique) :

- **Starter** : `carnet_destinataires` (carnet clients, jusqu'à 100),
  `adresses_favorites` (jusqu'à 10), `tableau_de_bord_avance` (courses du
  mois, dépenses, clients servis, taux de réussite/annulation),
  `export_pdf`, `notifications_historique`.
- **Business** (en plus de Starter) : `gestion_equipe` (jusqu'à 3
  utilisateurs additionnels), `multi_points_depart`, `export_excel`,
  `coursiers_favoris` (suivi, sans garantie d'attribution), `support_prioritaire`,
  `commandes_masse` (import CSV avec aperçu avant création).

**Écarts avec le document générique** — identifiés, pas construits
spéculativement : pas de « livraisons groupées » (distinct de
`multi_points_depart`, qui ne fait que multiplier les points de retrait),
pas de « commandes récurrentes », pas de « preuves avancées » au-delà du
code de réception OTP existant, pas de « facturation » (aucun module
invoice/facture dans le repo), pas de « tracking personnalisé ». Si l'une
de ces fonctionnalités est demandée explicitement, l'ajouter au catalogue
`CATALOGUE_FONCTIONNALITES_PREMIUM` avec sa vérification serveur — ne pas
la simuler uniquement côté interface en s'appuyant sur un texte qui laisse
croire qu'elle existe déjà.

**Nuance** : `programmation` (planifier une course à l'avance) est
disponible à **tout palier**, y compris Gratuit — contrairement au
document générique qui la classe comme fonctionnalité Starter. Ne pas la
gater sans une décision produit explicite qui changerait ce comportement
existant.

## Analytics : une question opérationnelle par graphique

`tableau_de_bord_avance` (Starter) répond déjà à des questions concrètes
(courses du mois, dépenses, clients servis, taux de réussite/annulation)
plutôt que de proposer un outil BI générique — modèle à suivre pour toute
nouvelle vue analytique : chaque ajout doit répondre à une question
opérationnelle précise (« combien ai-je livré/dépensé », « quel est mon
taux de réussite ») plutôt qu'exposer une donnée brute sans question
associée. Pas de vue « où ai-je le plus de livraisons » (carte de
chaleur géographique) construite aujourd'hui — gap identifié, pas à
construire spéculativement.

## Critères de validation

- [ ] Forfait lu via `calculerPlanEffectif()`, jamais `subscriptionPlan` brut
- [ ] Nouvelle fonctionnalité premium ajoutée au catalogue
      `CATALOGUE_FONCTIONNALITES_PREMIUM` avec vérification côté serveur
- [ ] Upsell via `CarteUpsellPro`, aucun écran de verrouillage personnalisé
- [ ] Écran d'onglet affichant le forfait → `useFocusEffect`, pas `useEffect` seul
- [ ] Requête du forfait jamais groupée dans un `Promise.all` avec une
      requête annexe pouvant échouer partiellement
- [ ] Maximum 4 KPIs au-dessus de la ligne de flottaison sur le tableau
      de bord commerce, chacun répondant à une question opérationnelle précise
- [ ] Fonctionnalité citée dans une conversation produit vérifiée contre
      le contenu réel de `CATALOGUE_FONCTIONNALITES_PREMIUM` avant de la
      présenter comme existante (ex. commandes récurrentes, facturation,
      livraisons groupées : pas construites aujourd'hui)
