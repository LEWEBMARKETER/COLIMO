---
name: colimo-delivery-flow
description: >
  Architecture du cycle de vie d'une course COLIMO (statuts, transitions,
  historisation, notifications). Utiliser avant de toucher au statut d'une
  course, d'ajouter un workflow de livraison (échec, litige, annulation,
  validation), ou de déclencher une communication liée à une course.
---

# Delivery Flow — COLIMO

## Mission

Le parcours d'une course, en principe :

```
COMMANDE → PLANIFICATION → DISPATCH → RETRAIT → LIVRAISON
  → CONFIRMATION → PREUVE → CLÔTURE
```

Correspondance avec les statuts réels (voir section suivante) :
`en_attente_paiement`/`en_attente` = COMMANDE+PLANIFICATION, `acceptee` =
DISPATCH terminé (un coursier a pris la course), `retrait` = RETRAIT,
`en_cours` = LIVRAISON, `livree` = CONFIRMATION en attente, `confirmee` =
CLÔTURE. La PREUVE est le code de réception OTP (masqué au coursier,
`track/[id].tsx`) plutôt qu'une étape de statut séparée.

À tout instant, l'utilisateur doit pouvoir répondre à trois questions :
où en est la course, quelle est la prochaine étape, dois-je agir. C'est
déjà le rôle de `BandeauStatut` + `StatusTimeline` (voir plus bas) — ne
pas construire un écran qui reformule ces trois questions autrement.

## Création d'une course

Réduire la charge cognitive dès la première question. Patron réel
(`publish.tsx`, `Stepper` 6 étapes — voir `colimo-mobile-ux`) : la première
étape est déjà « Récupération » (adresse de retrait), pas un choix de type
de colis en amont. Le type de colis est demandé à l'étape « Colis » via
`GroupePastilles` sur `CategorieColis` — les valeurs réelles sont `repas`,
`courses_alimentaires`, `documents`, `vetement`, `medicament`, `articles`,
`electromenager`, `autres` (`CATEGORIE_COLIS_LABELS`,
`packages/shared/src/types/index.ts`) : plus fin que la liste générique
« Colis/Document/Repas/Commande commerce/Autre », ne pas la réduire à ces
5 catégories génériques si une modification touche cet écran.

Chaque étape du Stepper couvre : Récupération (adresse), Livraison
(adresse), Colis (catégorie + taille via `TAILLES`), Options, Paiement,
Confirmation — cette dernière étape sert déjà de récapitulatif avant
validation, ne pas ajouter un écran de récap séparé en plus du Stepper.

## Adresses

Réel : `SelecteurPointCarte` combine recherche (`geocoderAdresse`) et
géolocalisation (`expo-location`, `Location.getCurrentPositionAsync`) avec
une carte (`CarteOSM`) — la recommandation « recherche + géolocalisation »
est déjà en place, ne pas dupliquer un second sélecteur d'adresse.

**Gap identifié** : les adresses favorites/récentes (`CommerceAdresseFavorite`,
`getAdressesFavoritesCommerce`) n'existent aujourd'hui **que côté compte
commerce** (`(client)/commerce/adresses.tsx`, limite 10). Un client final
créant une livraison via `publish.tsx` ressaisit sa recherche à chaque
course — pas d'adresses favorites/récentes pour ce cas. Ne pas construire
cette extension spéculativement ; si une tâche future la demande
explicitement, réutiliser le même modèle (`CommerceAdresseFavorite`) plutôt
qu'en inventer un nouveau.

## Course active — affichage déjà construit

`track/[id].tsx` affiche déjà : `BandeauStatut` (statut), position temps
réel du coursier + ETA (`distanceRestanteM`/`etaSecondes`, uniquement
pendant les statuts où `positions_coursiers` est lisible par le client),
code de réception OTP, actions contextuelles selon le statut (ex. relance
paiement si `en_attente_paiement`). Ne pas reconstruire cet écran ; l'étendre
si un champ manque (ex. nouvel indicateur de temps) plutôt que dupliquer.

## Timeline

`StatusTimeline` (voir section « Affichage » plus bas) — ne pas afficher
plus d'étapes techniques que ce que le client doit suivre ; les statuts
internes (`en_attente_paiement` avant paiement confirmé, par exemple) sont
déjà filtrés/simplifiés dans l'affichage existant.

## Les statuts existants suffisent presque toujours

`course_status` (enum Postgres, `packages/shared/src/types/index.ts`) :

```
en_attente_paiement → en_attente → acceptee → retrait → en_cours
  → livree → confirmee
             ↘ annulee / litige / retournee / echouee
```

Avant d'ajouter un nouveau statut pour représenter un besoin métier,
vérifier qu'il ne correspond pas déjà à un statut existant sous un autre
nom. Exemple vécu (besoin « Validation administrative finale d'une
course ») : le besoin décrivait un statut « Livraison à confirmer » —
c'est exactement le statut existant `livree` (coursier a remis le colis,
en attente de confirmation), pas un nouveau statut à créer. « Livraison
confirmée / Course clôturée » est `confirmee`. Le cas « contesté » est
`litige`, déjà pourvu d'un système de traitement complet.

**Règle** : ne jamais ajouter de valeur à `course_status` pour un cas qui
peut se modéliser comme (a) une nuance/sous-décision d'un statut existant,
journalisée dans une table dédiée, ou (b) une réutilisation d'un statut
terminal existant (`litige` pour tout ce qui nécessite un arbitrage,
`confirmee`/`annulee`/`retournee` pour toute clôture).

## Le patron « décision + historique dédié »

Un workflow qui ajoute une décision humaine sur une course (motif, résultat,
note) se modélise par **une table dédiée `historique_<nom>_<livraison>`**,
jamais par un statut supplémentaire ni par une colonne générique
"détails" surchargée. Précédents à suivre :

- `historique_echecs_livraison` (motif obligatoire, décision
  nouvelle_tentative/retour) — échec de remise par le coursier.
- `historique_confirmation_livraison` (événements typés OTP/photo/confirmation).
- `historique_validation_admin_livraison` (méthode de vérification, résultat,
  note, source) — validation de secours par un admin.

Chaque table de ce type : colonnes typées explicites (jamais un `jsonb`
fourre-tout pour des champs qu'on sait à l'avance), `course_id` en FK,
append-only (aucune policy `update`), RLS restreinte aux parties
concernées (ou admin uniquement si l'information doit « rester interne au
back-office », précédent : `historique_validation_admin_livraison`).

## Toute transition privilégiée passe par une RPC `security definer`

Jamais de `patchCourse` direct pour un changement de statut sensible. La
RPC doit, dans cet ordre : vérifier le rôle/l'appartenance de l'appelant,
valider le statut courant de la course (raise exception si incompatible),
appliquer la transition, puis `perform set_config('colimo.systeme_interne',
'true', true)` **avant** l'`update` — les triggers `proteger_transition_livree_courses`
et `proteger_colonnes_privilegiees_courses` laissent passer un `update`
uniquement si ce flag est posé ou si l'appelant est admin. Toujours
terminer par un `insert` dans la table d'historique dédiée. Précédents :
`declarer_echec_livraison`, `traiter_echec_livraison`, `valider_livraison_admin`,
`resoudre_litige`.

## Affichage : réutiliser les composants existants

`StatusTimeline` (mobile) et `BandeauStatut` (mobile) sont les **seuls**
composants de statut de course — ils dérivent leur libellé et leur couleur
de `COURSE_STATUS_LABELS`/`TEINTES_STATUT` (voir `colimo-design-system`).
Ne pas construire un affichage de statut parallèle. `StatusTimeline`
calcule déjà une durée écoulée ; si un statut manque d'indicateur de temps
utile (ex. recherche de coursier en cours), étendre son calcul plutôt que
créer un composant séparé.

## Notifications : toujours via le Communication Center

Ne jamais appeler un fournisseur (SMS/email/WhatsApp/push) directement, ni
écrire dans la table `notifications` à la main. Point d'entrée unique :
`communication.send()` (`packages/shared/src/communication/service.ts`) ou
le wrapper `notifierEvenement()` (`apps/mobile/lib/communication.ts`,
`apps/admin/lib/communication.ts`) pour un événement déjà catalogué. Pour
un nouvel événement : ajouter l'entrée dans `EvenementCommunication` +
`EVENEMENT_MODELE_CODE` + `EVENEMENT_CANAL`
(`communication/events/index.ts`), et le modèle de message dans
`modeles_notification` via une migration — jamais de texte codé en dur
dans le composant.

## Échec de livraison — ne jamais laisser une impasse

Réel (`declarer_echec_livraison`, migration dédiée) : le coursier déclare
l'échec avec un motif obligatoire parmi `client_absent`,
`telephone_injoignable`, `adresse_incorrecte`, `client_refuse`,
`probleme_colis`, `autre` — c'est déjà la couverture concrète de « client
injoignable / adresse incorrecte / livraison refusée » de la mission.
Suite (`traiter_echec_livraison`) : deux décisions seulement, `nouvelle_tentative`
(la course retourne dans le pool de recherche de coursier, `coursier_id`
réinitialisé) ou `retour` (statut `retournee`, `frais_retour` = 50 % du
prix). C'est déjà « Réessayer / Retourner le colis » de la mission ;
« Contacter » et « Reprogrammer » ne sont pas des décisions RPC séparées
dans ce modèle — reprogrammer une course revient à recréer une nouvelle
demande, contacter passe par les moyens déjà affichés sur la course
(téléphone destinataire/coursier), pas par un statut ou une table dédiée.
Ne pas ajouter ces deux comme décisions RPC sans vérifier que le besoin
n'est pas déjà couvert par ce mécanisme existant.

## États critiques — correspondance avec le modèle réel

| État de la mission | Réalité dans le repo |
|---|---|
| Client injoignable | motif `client_absent`/`telephone_injoignable` (`historique_echecs_livraison`) |
| Coursier injoignable | pas de motif dédié aujourd'hui — gap identifié, pas construit spéculativement |
| Adresse incorrecte | motif `adresse_incorrecte` |
| Annulation | statut `annulee`, `motifAnnulation`/`commentaireAnnulation` sur `courses` |
| Livraison refusée | motif `client_refuse` |
| Retard | pas un statut séparé : `retard_important` n'existe que comme **motif de litige** (une fois contesté) ; le suivi ETA/position en temps réel (`track/[id].tsx`) est la seule mitigation avant contestation — pas d'alerte de retard automatique construite |
| Échec paiement | statut `en_attente_paiement` : la course n'est simplement jamais envoyée aux coursiers tant que le paiement n'est pas confirmé, pas un flux d'échec+retry séparé |
| Échec d'assignation | **n'existe pas comme tel** : COLIMO n'a pas de moteur de dispatch automatique — les coursiers éligibles voient la course dans un pool premier-arrivé-premier-servi (`get_coursiers_eligibles_course` sert uniquement à prioriser une notification, pas à assigner). Une course qui ne trouve pas de coursier reste simplement `en_attente`/`acceptee` ; ne pas construire un statut ou un workflow "échec d'assignation" sans revoir d'abord ce mécanisme de pool |
| Litige | déjà couvert, système complet (`resoudre_litige`, motifs : produit manquant, produit endommagé, erreur de commande, retard important, comportement inapproprié, colis non reçu, autre) |
| Retour | déjà couvert par la décision `retour` ci-dessus |

## Critères de validation

- [ ] Aucun nouveau statut ajouté à `course_status` sans avoir vérifié
      qu'un statut existant ne convient pas déjà
- [ ] Décision/motif/résultat journalisé dans une table dédiée
      append-only, colonnes typées (pas de `jsonb` fourre-tout évitable)
- [ ] Transition de statut sensible exclusivement via une RPC
      `security definer` qui pose `colimo.systeme_interne` avant l'update
- [ ] Affichage via `StatusTimeline`/`BandeauStatut`, pas un patron parallèle
- [ ] Toute communication passe par `communication.send()`/`notifierEvenement()`,
      jamais un fournisseur ou la table `notifications` en direct
- [ ] Échec de livraison géré via les motifs/décisions existants
      (`declarer_echec_livraison`/`traiter_echec_livraison`), pas un nouveau
      statut ou une nouvelle table pour un cas déjà couvert
- [ ] Un « échec d'assignation » ou une alerte de retard automatique n'est
      pas ajouté sans vérifier d'abord le mécanisme de pool
      premier-arrivé-premier-servi existant (pas de dispatch automatique)
