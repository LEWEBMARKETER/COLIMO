> **Mise à jour (0038)** : le lien public utilise désormais un code court
> lisible (`courses.code_suivi`, ex. `CLM-X7P4-K92M`) au lieu du jeton uuid
> `token_suivi` décrit ci-dessous (conservé en base, plus utilisé). La
> position du coursier, la distance restante et l'ETA ont aussi été
> ajoutées à ce même écran — voir `docs/GEOLOCALISATION.md` pour le détail.

# Suivi public d'une course par le destinataire

Le destinataire d'un colis (celui qui le reçoit) n'a, la plupart du temps,
aucun compte COLIMO — jusqu'ici il n'avait donc aucun moyen de suivre sa
livraison. Ce module lui donne un lien de suivi en lecture seule, sans
connexion, envoyé automatiquement par WhatsApp à la création de la course.

## Principe

Toute course a désormais un `token_suivi` (uuid aléatoire, distinct de son
`id`, généré automatiquement à l'insertion). Le lien
`https://colimo.online/suivi/<token_suivi>` :

- est envoyé au destinataire (`courses.telephone_destinataire`) via la
  notification WhatsApp existante `livraison_creee`, déclenchée à la
  création de la course des deux façons possibles (`publish.tsx` pour un
  client particulier, `nouvelle-livraison.tsx` pour un commerce) ;
- peut aussi être repartagé manuellement par l'expéditeur depuis son propre
  écran de suivi (`(client)/track/[id].tsx`, bouton "Partager le suivi") ;
- ne nécessite aucune session, aucun compte — accessible à quiconque
  possède le lien.

## Pourquoi une fonction dédiée plutôt qu'assouplir RLS

Toutes les policies RLS existantes sur `courses` reposent sur
`auth.uid()`/`current_user_type()` — un visiteur anonyme n'a ni l'un ni
l'autre. Plutôt que d'ajouter une clause `or true` (qui exposerait toute la
table), l'accès public passe exclusivement par
`get_course_suivi_public(p_token uuid)` — une fonction `security definer`
qui :

- ne renvoie **que** la ligne dont `token_suivi` correspond exactement (un
  uuid aléatoire n'est pas devinable) ;
- ne renvoie **jamais** le prix, le mode de paiement, la commission ni la
  réduction promo — non pertinents pour le destinataire, et exclus du type
  de retour de la fonction elle-même (pas seulement masqués côté écran) ;
- joint et renvoie aussi le nom/téléphone/note du coursier une fois
  attribué (`utilisateurs`/`coursiers` sont normalement inaccessibles à un
  visiteur anonyme — la jointure security definer contourne cette
  restriction uniquement pour ces colonnes précises).

`apps/mobile/app/suivi/[token].tsx` (nouvelle route, hors des groupes
`(auth)`/`(client)`/`(coursier)`) affiche : statut, type de colis, carte/
itinéraire, contact + bouton d'appel de l'expéditeur (point de
récupération) et du coursier une fois attribué, adresse de livraison,
instructions, historique des étapes (`StatusTimeline`, réutilisé tel quel).
Aucune action réservée à l'expéditeur (annuler, confirmer la réception,
signaler un problème, discuter) — lecture seule uniquement. Rafraîchi toutes
les 3 secondes (même principe de polling que l'écran de suivi authentifié,
pas de nouvelle plomberie Realtime).

## Modifications de composants existants

`StatusTimeline` acceptait un `Course` complet mais n'utilise que
`statut`/`createdAt`/`accepteeAt`/`recupereeAt`/`livreeAt`/`confirmeeAt` —
son prop est maintenant typé `Pick<Course, ...>` (rétrocompatible), pour
être réutilisable tel quel avec la vue réduite `CourseSuiviPublic` sans
fabriquer de fausses données.

## Migration à appliquer

`supabase/migrations/0037_suivi_public_courses.sql` :
1. `courses.token_suivi` (colonne + valeur par défaut, rétroactive sur les
   lignes existantes grâce à `gen_random_uuid()` en `default`).
2. Fonction `get_course_suivi_public`.
3. Ajoute `{{lien_suivi}}` au modèle WhatsApp `whatsapp_livraison_creee` —
   **uniquement si son contenu est encore celui du seed d'origine** (ne
   jamais écraser une personnalisation déjà faite depuis Communication
   Center > Templates). Si la condition ne correspond pas, ajouter
   `{{lien_suivi}}` manuellement dans l'admin.

## Vérification effectuée

- `pnpm --filter @colimo/shared typecheck`, `--filter @colimo/mobile typecheck` : OK
- `pnpm --filter @colimo/mobile build:web` : OK

**Non testé en conditions réelles** (nécessite la migration 0037 appliquée
sur Supabase) — à valider par l'utilisateur : créer une course, recevoir le
WhatsApp avec le lien, l'ouvrir sans être connecté, confirmer que le statut
se met à jour en direct pendant que le coursier progresse.
