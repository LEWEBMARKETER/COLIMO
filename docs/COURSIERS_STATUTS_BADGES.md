# Module Coursiers — Statuts, Badges, Niveaux — COLIMO

Module indépendant de gestion des coursiers : statut opérationnel, badges de
confiance/performance, niveaux de progression, statistiques, historique
d'audit. Entièrement administrable depuis le back-office (menu Coursiers,
onglets Dashboard/Liste des coursiers/Statuts/Badges/Performances/
Historique/Paramètres) — badges, niveaux et seuils évoluent sans
déploiement.

**Statuts** (état administratif/opérationnel) et **badges** (confiance,
performance, qualification) sont deux systèmes volontairement distincts et
indépendants.

## Statuts — 7 états

| Statut | Stocké en base ? | Déclenché par |
|---|---|---|
| En attente de validation | ✅ (`en_attente_validation`) | Inscription du coursier |
| Vérifié | ✅ (`verifie`) | Admin valide le dossier (auto via trigger, cf. plus bas) |
| En ligne | ✅ (`en_ligne`) | Le coursier active "Disponible" côté mobile |
| **Occupé** | ❌ — **dérivé**, jamais stocké | Le coursier a une course active (`acceptee`/`retrait`/`en_cours`) |
| Hors ligne | ✅ (`hors_ligne`) | Le coursier désactive "Disponible" |
| Suspendu | ✅ (`suspendu`) | Admin, avec motif obligatoire |
| Désactivé | ✅ (`desactive`) | Admin, fermeture définitive |

`coursiers.statut` (enum Postgres `statut_coursier`, **6 valeurs**) est le
champ canonique. "Occupé" n'existe pas dans l'enum — c'est un état affiché
uniquement, calculé par `calculerStatutEffectif(statut, aCourseEnCours)`
(`packages/shared/src/coursiers/statuts/index.ts`). Ne jamais ajouter
`occupe` à l'enum DB : ce serait redondant avec l'état des courses et
introduirait un risque de désynchronisation.

Un rejet de dossier (`statutVerification: 'rejete'`) ne force aucun des 7
statuts canoniques — le coursier reste `en_attente_validation`, filtré via
`statutVerification` plutôt que de surcharger "Désactivé" avec un sens
différent.

### Synchronisation automatique (trigger `coursiers_sync_statut`)

- `statutVerification → valide` fait passer `statut: en_attente_validation → verifie` automatiquement (pas besoin de le patcher explicitement)
- Changer `statut` fait suivre `disponibilite` (`en_ligne` → `true`, sinon `false`)
- Changer `disponibilite` (toggle mobile inchangé) fait suivre `statut` (`en_ligne`/`hors_ligne`) — uniquement si le coursier n'est pas suspendu/désactivé/en attente

`utilisateurs.statut` n'est **plus** utilisé pour les coursiers (reste
inchangé pour clients/commerçants) — un backfill unique (migration 0023) a
lu cette colonne une seule fois pour préserver les coursiers déjà
suspendus, sans jamais y réécrire depuis.

## Badges

10 badges seedés (`catalogue_badges`), chacun avec nom/icône/description/
couleur/mode d'attribution (`automatique`|`manuel`)/règle (`jsonb`, seuils
configurables) :

| Badge | Mode | Seuils par défaut |
|---|---|---|
| ✅ Coursier Vérifié | Auto | Dossier validé |
| 🛡️ Coursier Certifié | Manuel | Formation COLIMO (jugement admin) |
| ⭐ Premium | Auto | ≥200 livraisons, note ≥4.8, annulation ≤5% |
| 🚀 Livraison Express | Auto | Durée moyenne ≤20 min |
| 💎 Elite | Auto | ≥1000 livraisons, note ≥4.9, annulation ≤2% |
| 🏆 Top Performer | Auto | ≥500 livraisons, note ≥4.7 |
| ❤️ Très apprécié | Auto | Note ≥4.9 |
| ⏱️ Rapide | Auto | Durée moyenne ≤25 min |
| 📦 Expert Livraison | Auto | ≥300 livraisons |
| 🌟 Fidèle | Auto | ≥100 livraisons |

Tous les seuils sont modifiables depuis Coursiers → Paramètres (JSON des
seuils par badge) — aucun redéploiement nécessaire.

`badges_coursiers` (table d'attribution) a un index unique partiel sur
`(coursier_id, badge_id) where retire_le is null` : un badge retiré puis
ré-attribué crée une nouvelle ligne, préservant l'historique complet.
`attribuerBadge()` est idempotent (renvoie l'attribution existante plutôt
que d'échouer) — important car l'automatisation peut l'appeler à répétition
pour un badge déjà acquis.

## Niveaux

Progression par nombre de livraisons, seuils dans `catalogue_niveaux`
(éditables en Paramètres) :

Débutant (0) · Bronze (50) · Argent (200) · Or (500) · Platine (1000) ·
Diamant (3000)

`calculerNiveau(nombreLivraisons, paliers)` est une fonction pure — le
niveau n'est pas recalculé à chaque lecture mais stocké
(`coursiers.niveau_id`), mis à jour uniquement par le RPC
`definir_niveau_coursier` (seul point d'écriture autorisé par RLS).

## Statistiques

`coursiers.nombre_livraisons` / `nombre_courses_assignees` /
`nombre_courses_annulees` / `duree_livraison_totale_secondes` sont des
compteurs dénormalisés, maintenus par le trigger
`courses_maj_statistiques_coursier` (`AFTER UPDATE on courses`) — pas de
recalcul à la volée. `coursiers.note_moyenne`, qui était du **code mort**
depuis la mise en place initiale du schéma (jamais recalculée), est
désormais maintenue par le trigger `notations_maj_note_moyenne`
(`AFTER INSERT on notations`).

`calculerStatistiquesCoursier(coursier, utilisateur)` (fonction pure) dérive
taux de réussite/annulation (fractions 0..1), durée moyenne de livraison et
ancienneté à partir de ces compteurs.

## Pourquoi certains triggers sont `security definer`

Plusieurs écritures traversent la table `coursiers` depuis une session qui
n'est ni le coursier ni un admin — typiquement le **client** qui confirme
une réception de livraison, ou qui note un coursier. La policy RLS
`coursiers_update_own_or_admin` bloquerait silencieusement ces écritures
sans `security definer` (même raisonnement que `current_user_type()` et
`coursier_couvre_zone()`, déjà en place depuis les migrations 0001/0013) :
`maj_statistiques_coursier`, `maj_note_moyenne_coursier`,
`definir_niveau_coursier` (RPC) sont tous `security definer`.

## Automatisation

`recalculerBadgesEtNiveau(client, utilisateurId)` — point d'entrée unique,
`packages/shared/src/coursiers/automation/index.ts`. Résout lui-même
l'utilisateur en coursier (no-op silencieux si ce n'est pas un coursier),
ce qui permet de l'appeler indifféremment depuis un flux client ou coursier
sans avoir à le savoir à l'avance — utile car `NotationForm` sert dans les
deux sens (client note coursier, coursier note client).

Câblé à :
- `apps/mobile/app/(client)/track/[id].tsx#confirmerReception` (après confirmation de livraison)
- `apps/mobile/components/NotationForm.tsx#envoyer` (après chaque notation)
- En interne, à la fin de `validerDossierCoursier` (badge "Coursier Vérifié" s'attribue au moment même de la validation admin)

Aucune tâche planifiée (cron/Edge Function) — le recalcul déclenché par
événement couvre le besoin sans introduire de nouvelle infrastructure.

## Historique (`historique_coursier`)

Chaque action admin (ou automatique) — changement de statut, badge,
niveau, commentaire interne, validation/rejet de dossier, suspension,
réactivation, désactivation — est journalisée : date, administrateur (null
= automatique), action, ancienne/nouvelle valeur, motif, commentaire.
Lecture réservée aux admins (contient des motifs de suspension et
commentaires internes).

## Enforcement (v1, portée délibérément limitée)

Avant ce module, `utilisateurs.statut='suspendu'` n'était appliqué **nulle
part** (ni RLS ni mobile). Ce module ne dégrade donc rien en ajoutant
seulement de l'outillage admin. Portée retenue :

- Mobile : dashboard coursier bloque le toggle "Disponible" et affiche un
  message si `statut` est `suspendu`/`desactive`/`en_attente_validation`
- Mobile : `AuthContext#chargerProfil` déconnecte immédiatement un coursier
  `desactive` (satisfait "aucune connexion possible")
- RLS : migration 0026 ajoute `coursier_est_actif()` (statut `verifie` ou
  `en_ligne`) à la clause de navigation "coursier cherche une course" de
  `courses_select_client_coursier_or_admin` — ne touche ni les policies
  update/accept, ni l'accès client/admin

**Explicitement différé** : réécriture des policies d'acceptation/update de
course pour bloquer un coursier déjà référencé sur une course avant
suspension — risque disproportionné (haut rayon d'impact sur le flux de
livraison) pour un gain résiduel théorique (nécessite de contourner l'UI).

## Où se trouve le code

- `supabase/migrations/0023_coursiers_statut_stats.sql` — statut canonique, compteurs, triggers (sync statut, stats courses, note_moyenne)
- `supabase/migrations/0024_coursiers_historique.sql` — table `historique_coursier`
- `supabase/migrations/0025_coursiers_badges_niveaux.sql` — catalogues badges/niveaux, seeds, RPC `definir_niveau_coursier`
- `supabase/migrations/0026_coursiers_rls_visibilite.sql` — enforcement RLS ciblé
- `packages/shared/src/coursiers/` — `statuts/`, `badges/` (+ `evaluation.ts` pure), `niveaux/` (+ `calcul.ts` pure), `statistics/` (+ `dashboard.ts` pure), `historique/`, `automation/`
- `apps/admin/app/(dashboard)/coursiers/page.tsx` — page à 7 onglets
- `apps/admin/app/(dashboard)/coursiers/[id]/page.tsx` — fiche coursier (actions admin, historique)
- `apps/admin/components/BadgePill.tsx`, `NiveauBadge.tsx` — couleurs arbitraires (non sémantiques), `StatutBadge.tsx` étendu pour les nouveaux statuts
- `apps/mobile/app/(coursier)/(tabs)/dashboard.tsx`, `apps/mobile/lib/AuthContext.tsx` — enforcement mobile

## Ajouter un nouveau badge ou niveau

Aucune migration nécessaire : insérer une ligne dans `catalogue_badges` ou
`catalogue_niveaux` (ou utiliser Coursiers → Paramètres pour éditer
l'existant). Un badge automatique doit définir au moins un seuil dans
`regle` — un badge `automatique` avec une règle vide n'est jamais éligible
(évite qu'un badge mal configuré s'attribue à tout le monde).
