# Attribution intelligente des courses (mise en avant du meilleur match)

Le modèle d'attribution existant ne change pas : une course publiée reste
visible à tous les coursiers éligibles d'une zone, premier arrivé premier
servi (`apps/mobile/app/(coursier)/(tabs)/dashboard.tsx#accepter`). Cette
fonctionnalité ajoute uniquement de la **mise en avant** :

- Dans le dashboard du coursier, les courses dans sa zone principale
  (`utilisateur.zone`) remontent en premier et portent un badge "★ Pour
  vous" — le reste du pool (ses autres zones couvertes) suit, trié par
  ancienneté.
- À la création d'une course, les 3 coursiers les mieux placés (zone
  couverte + note moyenne + peu d'annulations, cf.
  `packages/shared/src/coursiers/attribution`) reçoivent en plus une
  notification prioritaire — WhatsApp (`coursier_nouvelle_course_disponible`,
  catalogué depuis longtemps mais jamais déclenché jusqu'ici) et in-app
  (`notification_coursier_nouvelle_course_disponible`, nouveau).

## Pourquoi pas une vraie distance GPS

Un coursier n'est géolocalisé que pendant une course active (0038,
confidentialité/batterie) — calculer une vraie distance pour une course pas
encore acceptée demanderait de transmettre sa position même en simple
attente, ce qui reviendrait sur ce choix. Le score s'appuie donc sur les
zones couvertes déjà déclarées par le coursier (`coursiers.zones_couvertes`),
pas une position en temps réel. Amélioration possible plus tard si le choix
de confidentialité change.

## Sécurité

Un client ne peut pas, via RLS, lister les coursiers d'une zone (leurs
numéros de téléphone seraient exposés à n'importe qui). La fonction
`get_coursiers_eligibles_course` (0039, security definer) ne renvoie de
résultat que pour LA course dont l'appelant est le client, tant qu'elle n'a
pas encore de coursier assigné (`statut = 'en_attente'`) — jamais un accès
plus large à la table `coursiers`.

## Vérifications effectuées

- `pnpm --filter @colimo/shared typecheck`, `--filter @colimo/mobile typecheck` : OK.

**Non testé en conditions réelles** (nécessite la migration 0039 appliquée) —
à valider par l'utilisateur : créer une course, vérifier que les coursiers
les mieux notés de la zone reçoivent la notification in-app "Nouvelle course
recommandée", et que la course remonte en tête avec le badge "★ Pour vous"
dans leur dashboard.
