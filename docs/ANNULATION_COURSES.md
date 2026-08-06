# Module Annulation des courses

Gestion complète de l'annulation d'une course : par le client (dans une
fenêtre limitée), par l'admin (à tout moment), et la résolution des litiges
qui ferme l'accès à l'annulation client une fois le colis récupéré.

## Principe de sécurité

Le contrôle est **toujours serveur**, jamais seulement front-end. Avant ce
module, `courses_update_client_coursier_or_admin` (RLS) autorisait
`client_id = auth.uid()` à écrire `statut` sans aucune restriction de
fenêtre temporelle — un appel API direct (contournant l'application)
pouvait annuler une course à n'importe quel moment.

La migration `0030_annulation_courses.sql` ferme ce trou :
`proteger_colonnes_privilegiees_courses` (trigger `BEFORE UPDATE`, étendu
depuis l'audit de sécurité 0028) rejette **toute** écriture directe de
`statut = 'annulee'` par une session non-admin, quel que soit le statut
actuel de la course. La seule façon d'annuler pour un client est d'appeler
la RPC `annuler_course_client`, qui vérifie la fenêtre et pose un indicateur
transaction-locale (`colimo.systeme_interne`) pour contourner ce même
trigger le temps de sa propre écriture — même mécanisme que les RPC
badges/niveaux de coursiers (0029).

## Fenêtre d'annulation client

| Statut `courses.statut` | Annulable par le client ? |
|---|---|
| `en_attente_paiement`, `en_attente` | Oui |
| `acceptee` | Oui |
| `retrait` (coursier en route vers le point de récupération) | Oui |
| `en_cours` (colis récupéré) et au-delà | **Non** |

Il n'existe pas de statut distinct "colis récupéré" dans le schéma : le
passage `retrait → en_cours` **est** le moment du retrait. Dès que la
course atteint `en_cours`, le bouton "Annuler la course" disparaît de
l'app mobile (`peutAnnulerCourse`, `packages/shared/src/annulations/index.ts`)
et toute tentative côté serveur (RPC ou PATCH direct) échoue avec le
message : *"Cette course ne peut plus être annulée car le colis a déjà été
récupéré par le coursier."*

## RPC (migration 0030)

- **`annuler_course_client(course_id, motif, commentaire?)`** — vérifie que
  l'appelant est bien le client de la course et que le statut est dans la
  fenêtre autorisée, sinon lève une exception. Écrit `annulee_par`,
  `motif_annulation`, `commentaire_annulation` sur `courses`, trace une
  ligne dans `historique_annulations` (`role` dérivé de
  `utilisateurs.type_client` : `client_particulier` ou `client_commerce`).
- **`annuler_course_admin(course_id, motif, commentaire?)`** — réservé aux
  comptes `current_user_type() = 'admin'`, disponible quel que soit le
  statut de la course (sauf si déjà annulée).
- **`resoudre_litige(course_id, resolution, motif?, commentaire?, montant?)`**
  — réservé à l'admin, sur une course `statut = 'litige'`. `resolution` ∈
  `maintenue | annulee | retour | remboursement_partiel |
  remboursement_total | rejetee`.

## Résolution de litige — les 6 issues

| Issue | Effet sur `courses.statut` | Notes |
|---|---|---|
| Maintenir la course | Restauré à `statut_avant_litige` | La livraison reprend son cours normal |
| Annuler la course | `annulee`, `frais_retour = 0` | Motif admin obligatoire, trace dans `historique_annulations` |
| Retour du colis | `retournee`, `frais_retour = 50 % du prix` | Reprend `calculerFraisRetour` (`packages/shared/src/pricing`) |
| Remboursement partiel | Restauré à `statut_avant_litige` | Montant obligatoire, **enregistrement + notification uniquement** |
| Remboursement total | Restauré à `statut_avant_litige` | Montant = `prix` de la course |
| Rejeter la demande | Restauré à `statut_avant_litige` | Commentaire (raison) obligatoire |

**Limite assumée sur les remboursements** : COLIMO n'a pas de passerelle de
paiement automatisée (paiements Airtel Money déclarés manuellement, validés
par l'admin) — il n'existe donc aujourd'hui aucun mécanisme de remboursement
réel dans le code. Les décisions "remboursement partiel/total" sont
**enregistrées** (`litiges.resolution_montant`) et **notifiées** au client
(Communication Center), mais le virement réel reste un processus manuel de
l'équipe COLIMO en dehors de l'app, comme pour le reste des paiements
aujourd'hui.

`courses.statut_avant_litige` est posé automatiquement par
`set_course_status_timestamps` (trigger existant, 0018, étendu en 0030) dès
qu'une course passe à `litige`, pour permettre cette restauration.

## Historique (`historique_annulations`)

Table d'audit append-only (même rôle que `historique_coursier` pour les
coursiers) : `course_id`, `utilisateur_id`, `role`
(`client_particulier`/`client_commerce`/`admin`), `motif`, `commentaire`,
`statut_precedent`, `nouveau_statut`, `created_at`. Une ligne est créée pour
**chaque annulation réelle** (`annuler_course_client`, `annuler_course_admin`,
et la branche `annulee` de `resoudre_litige`) — pas pour les autres issues de
résolution de litige, qui ne sont pas des annulations. Lecture réservée aux
admins (page back-office `/annulations`) ; écriture exclusivement via les
RPC ci-dessus (aucune policy `insert` sur la table).

## Notifications (Communication Center)

Réutilisation quasi-totale du catalogue existant :
- `livraison_annulee` (whatsapp → `telephoneDestinataire`) et
  `notification_livraison_annulee` (push → compte client) — déjà existants.
- **Nouveau** : `notification_livraison_annulee_coursier` (push → compte
  coursier), wording distinct : *"La course {{numero_commande}} a été
  annulée par le client."* — le coursier doit comprendre qu'il n'a plus à
  se déplacer, pas juste "que c'est annulé".
- `litige_resolu` / `notification_litige_resolu` (déjà existants) sont
  réutilisés pour les 6 issues de résolution de litige, avec une variable
  `resolution` précise par issue (ex. *"Remboursement partiel accordé (12
  000 FCFA)"*).

Pas d'événement dédié "commerçant" : un commerçant est un compte client
(`utilisateurs.type_client = 'commerce'`), il reçoit donc déjà la
notification client standard.

## UI

- **Mobile** (`apps/mobile/app/(client)/track/[id].tsx`) : bouton "Annuler
  la course" visible uniquement si `peutAnnulerCourse(course)`. Route dédiée
  `apps/mobile/app/(client)/annuler/[courseId].tsx` +
  `components/AnnulerCourseForm.tsx` (motifs → confirmation, même famille
  que `SignalerLitigeForm.tsx` — écran plein, pas de modale flottante, le
  projet n'en a pas).
- **Admin** — `/courses` : action "Annuler la course" toujours visible
  (sauf si déjà annulée), motif obligatoire via un petit panneau inline.
  `/litiges` : les 6 boutons de résolution, panneau inline pour les issues
  qui demandent une saisie (motif, montant, commentaire). Nouvelle page
  `/annulations` : historique complet, filtrable par rôle et par
  utilisateur.

## Limite connue

La validation "commentaire obligatoire si motif = Autre" est uniquement
côté UI (comme le motif de signalement de litige existant) — pas dupliquée
serveur, car ce n'est pas un risque de sécurité. Ce qui **est** vérifié
côté serveur : la fenêtre temporelle et l'identité de l'appelant (RPC
`annuler_course_client`), et le blocage de toute écriture directe (trigger).
