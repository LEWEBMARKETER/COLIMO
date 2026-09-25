# Programmes — COLIMO

Module générique pour toute campagne d'inscription (commerçants, coursiers
ou particuliers) — **aucune table ni logique spécifique à une campagne**.
Une seule paire de tables (`programs` / `program_participants`) sert le
premier programme (100 Commerces Partenaires) et tous ceux à venir.

```
programs                        program_participants
├── target_type (merchant/       ├── program_id, user_id (unique ensemble)
│   courier/customer/all)        ├── status (pending/approved/rejected)
├── benefits (jsonb, contenu     ├── applied_at
│   configurable — jamais        └── reviewed_at / reviewed_by
│   codé en dur dans l'UI)
├── max_participants (nullable
│   = illimité)
└── status (draft/active/
    closed/archived)
```

## Où se trouve le code

- `supabase/migrations/0050_programmes.sql` — schéma, RLS, RPC, programme
  initial (100 Commerces Partenaires, `slug: 100-commerces-partenaires`)
- `packages/shared/src/programmes/` — types, mappers, requêtes
  (`getProgrammes`, `getParticipantsProgramme`, `candidaterProgramme`,
  `traiterCandidatureProgramme`, `getCompteurProgramme`,
  `calculerStatsProgramme`)
- `apps/mobile/components/CarteProgramme.tsx` — carte générique (n'importe
  quel programme), affichée dans `CommerceDashboard.tsx` pour les
  programmes ciblant `merchant` auxquels le commerce est éligible
- `apps/admin/app/(dashboard)/programmes/` — back-office : liste
  (`page.tsx`, avec création) et fiche programme (`[id]/page.tsx`,
  informations éditables + participants + filtres + Accepter/Refuser)

## Éligibilité

`target_type` (générique) est traduit vers les types de compte réels par
`utilisateur_est_eligible_programme()` (SQL, réutilisée par la RLS et par
la RPC `candidater_programme`) :

| target_type | Éligible |
|---|---|
| `merchant` | `utilisateurs.type = 'client'` et `type_client = 'commerce'` |
| `courier` | `utilisateurs.type = 'coursier'` |
| `customer` | `utilisateurs.type = 'client'` et `type_client` ≠ `'commerce'` |
| `all` | tout compte authentifié |

## Candidature et places restantes

Toute écriture passe par des RPC `security definer` (jamais d'insert/update
direct depuis le client) :

- `candidater_programme(p_program_id)` — vérifie l'éligibilité, le statut
  actif du programme et les places restantes avant d'insérer.
- `traiter_candidature_programme(p_participant_id, p_decision)` — admin
  uniquement ; revérifie les places disponibles au moment de l'acceptation
  (`approved` uniquement compte pour le quota, jamais `pending`).
- `compteur_participants_programme(p_program_id)` — décompte agrégé
  (participants acceptés / places restantes), lisible par tout utilisateur
  authentifié **sans** exposer la liste des candidatures (la RLS de
  `program_participants` ne laisse un non-admin lire que ses propres
  candidatures).

## Notifications

Aucun système de notification spécifique — les 3 événements
(`programme_candidature_recue/acceptee/refusee`) passent par le
Communication Center existant (`notifierEvenement`, cf.
`docs/COMMUNICATION_CENTER.md`), canal `push` (in-app).

## Ce qui n'est pas construit (préparé, pas développé)

Codes promotionnels, récompenses, challenges, paliers, parrainage,
avantages automatiques, statistiques dédiées, programmes payants ou sur
invitation — aucun de ces éléments n'existe aujourd'hui. Rien dans le
schéma (colonnes génériques, RPC séparées de toute logique métier
spécifique) ne les empêche d'être ajoutés plus tard sans reconstruire ce
module.
