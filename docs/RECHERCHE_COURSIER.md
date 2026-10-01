# Recherche d'un coursier — délai d'attente et annulation

Améliore l'attente pendant qu'une course est `en_attente` (aucun coursier
attribué) : compteur indicatif de 15 minutes basé sur un timestamp serveur
(`courses.created_at`), proposition explicite de continuer ou d'annuler
sans frais après ce délai, relance des coursiers éligibles, et
sécurisation du cas où une annulation et une acceptation arrivent en même
temps. Aucun nouveau statut de course, aucune nouvelle logique
d'annulation parallèle — tout passe par l'unique RPC existante
`annuler_course_client` (`supabase/migrations/0030_annulation_courses.sql`),
simplement étendue.

## Ce qui ne change pas

- `annuler_course_client` reste le seul point d'entrée d'annulation client,
  pour tous les motifs existants — comportement strictement identique.
- Aucun changement au chemin d'acceptation d'un coursier
  (`apps/mobile/lib/coursierActions.ts`), déjà protégé par la RLS existante
  (`courses_update_client_coursier_or_admin`, 0012) contre une double
  acceptation.
- Aucun changement de statut : « recherche active / prolongée / expirée »
  sont des états d'affichage dérivés de `created_at`, `coursier_id` et
  `statut`, jamais de nouvelles valeurs de `course_status`.

## Ce qui est nouveau

- `configuration_recherche_coursier` : délai de recherche (15 min par
  défaut) et intervalles de relance (`{5,10}` par défaut), admin-éditables
  (`supabase/migrations/0057`).
- `courses.recherche_prolongee_at` : posé une seule fois par la RPC
  `prolonger_recherche_coursier` quand le client choisit de continuer la
  recherche après expiration du délai indicatif (`0058`).
- `annuler_course_client` accepte désormais le motif
  `no_courier_available`, avec une vérification atomique
  (`coursier_id is null and statut = 'en_attente'` dans la clause `WHERE`
  elle-même) — si un coursier vient d'accepter entre-temps, l'annulation
  est refusée (`coursier_deja_accepte`) plutôt que d'annuler une course
  déjà prise en charge (`0059`).
- `relances_recherche_coursier` + `marquer_relances_recherche_dues` :
  détermine quand relancer les coursiers éligibles, sans dupliquer leur
  sélection (déjà faite par `notifierMeilleursCoursiers`,
  `apps/mobile/lib/communication.ts`) — appelée en piggyback sur le poll
  déjà existant de `track/[id].tsx`, pas par un cron Vercel (le seul cron
  du projet tourne une fois par jour, incompatible avec une granularité de
  5/10 minutes) (`0060`).

## Incohérence trouvée et corrigée (signalée comme demandé, avant toute autre modification)

En auditant `proteger_colonnes_privilegiees_courses` (déclencheur qui
protège les colonnes sensibles de `courses`) pour y ajouter
`recherche_prolongee_at`, constaté que **`0038_geolocalisation_coursiers.sql`
avait silencieusement annulé une protection de sécurité posée par
`0030_annulation_courses.sql`** : 0030 bloquait explicitement toute
écriture directe de `statut = 'annulee'` par une session non-admin (pour
forcer le passage par `annuler_course_client`, seule à historiser
l'annulation dans `historique_annulations`) ; la redéfinition suivante de
cette fonction (0038, pour les colonnes ETA) est repartie de la version de
0028 et a recopié ce blocage disparu. Depuis, n'importe quel compte client
ou coursier authentifié pouvait annuler une course par un simple `PATCH`
direct, sans passer par la RPC ni laisser de trace d'audit. Sans lien avec
cette mission, mais trouvé en touchant cette même fonction — restauré à
l'identique dans `0058` plutôt que laissé tel quel.

## Cas non applicable aujourd'hui (signalé, pas construit)

CAS F de la mission (« un coursier abandonne une course après
acceptation ») suppose un mécanisme de désistement coursier qui
**n'existe pas** dans le code actuel (aucune RPC ne remet `coursier_id` à
`null` après acceptation). Rien n'a été construit pour ce cas — à
traiter dans une mission dédiée si besoin, pas en périphérie de celle-ci.

## Script de vérification (à exécuter dans le SQL Editor après application des migrations 0057–0060)

Tourne entièrement dans une transaction annulée (`rollback` final).
Remplacer `v_client_id`/`v_coursier_utilisateur_id` par des UUID réels
existants avant exécution.

```sql
begin;

do $$
declare
  v_client_id uuid := (select id from utilisateurs where type = 'client' limit 1);
  v_coursier_utilisateur_id uuid := (select utilisateur_id from coursiers limit 1);
  v_course_id uuid;
  v_dus int[];
  v_resultat courses;
begin
  if v_client_id is null or v_coursier_utilisateur_id is null then
    raise exception 'Ce script nécessite au moins un client et un coursier existants.';
  end if;

  -- annuler_course_client résout le rôle de l'appelant via auth.uid() (et
  -- lève sinon une violation de contrainte sur historique_annulations.role,
  -- pas une erreur explicite) ; prolonger_recherche_coursier et
  -- marquer_relances_recherche_dues filtrent aussi sur client_id = auth.uid().
  -- Simule la session du client dans cette transaction (les deux formats de
  -- claim JWT, pour rester compatible quelle que soit la version
  -- d'auth.uid() de ce projet) — sans ça, auth.uid() renverrait null pour
  -- toute la suite et plusieurs assertions échoueraient à tort.
  perform set_config('request.jwt.claim.sub', v_client_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_client_id, 'role', 'authenticated')::text, true);
  if auth.uid() is distinct from v_client_id then
    raise exception 'auth.uid() ne s''est pas résolu à v_client_id — vérifier manuellement depuis l''app plutôt que ce script pour les scénarios B/H/I.';
  end if;

  -- === Régression corrigée : un PATCH direct de statut='annulee' doit
  -- rester bloqué pour une session non-admin (restauré en 0058, voir plus haut) ===
  insert into courses (client_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut)
  values (v_client_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'en_attente')
  returning id into v_course_id;

  begin
    update courses set statut = 'annulee' where id = v_course_id;
    raise exception 'Régression : un PATCH direct statut=''annulee'' aurait dû être bloqué pour une session non-admin.';
  exception
    when others then
      if sqlerrm = 'Régression : un PATCH direct statut=''annulee'' aurait dû être bloqué pour une session non-admin.' then
        raise;
      end if;
      raise notice 'OK : PATCH direct statut=''annulee'' toujours bloqué (%).', sqlerrm;
  end;

  -- === Scénario B : aucun coursier après 15 minutes, annulation sans frais ===
  insert into courses (client_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut, created_at)
  values (v_client_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'en_attente', now() - interval '16 minutes')
  returning id into v_course_id;

  select annuler_course_client(v_course_id, 'no_courier_available', null) into v_resultat;
  if v_resultat.statut != 'annulee' then
    raise exception 'Scénario B : la course aurait dû être annulée, statut obtenu %', v_resultat.statut;
  end if;
  raise notice 'OK (scénario B) : annulation "aucun coursier disponible" réussie sur une course non attribuée.';

  -- === Scénario H / CAS C : un coursier déjà attribué ne doit jamais être
  -- annulé via le motif "aucun coursier disponible" ===
  insert into courses (client_id, coursier_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut, created_at)
  values (v_client_id, v_coursier_utilisateur_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'acceptee', now() - interval '16 minutes')
  returning id into v_course_id;

  begin
    perform annuler_course_client(v_course_id, 'no_courier_available', null);
    raise exception 'Scénario H : l''annulation aurait dû être refusée (coursier déjà attribué).';
  exception
    when others then
      if sqlerrm != 'coursier_deja_accepte' then
        raise exception 'Scénario H : message d''erreur inattendu : %', sqlerrm;
      end if;
      raise notice 'OK (scénario H / CAS E) : annulation refusée (coursier_deja_accepte) pour une course déjà attribuée.';
  end;

  if (select statut from courses where id = v_course_id) != 'acceptee' then
    raise exception 'Scénario H : le statut de la course n''aurait jamais dû changer.';
  end if;
  raise notice 'OK : le statut de la course accepteé n''a pas été altéré par la tentative refusée.';

  -- === Scénario I / CAS D : colis déjà récupéré, annulation toujours bloquée ===
  update courses set statut = 'en_cours' where id = v_course_id;
  begin
    perform annuler_course_client(v_course_id, 'no_courier_available', null);
    raise exception 'Scénario I : l''annulation aurait dû être bloquée (colis déjà récupéré).';
  exception
    when others then
      raise notice 'OK (scénario I / CAS D) : annulation bloquée une fois le colis récupéré (%).', sqlerrm;
  end;

  -- === Prolongation de recherche (section 7) ===
  insert into courses (client_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut, created_at)
  values (v_client_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'en_attente', now() - interval '16 minutes')
  returning id into v_course_id;

  perform prolonger_recherche_coursier(v_course_id);
  if (select recherche_prolongee_at from courses where id = v_course_id) is null then
    raise exception 'Scénario "continuer la recherche" : recherche_prolongee_at aurait dû être posé.';
  end if;
  raise notice 'OK : prolonger_recherche_coursier pose recherche_prolongee_at pour une course éligible.';

  -- Idempotence : un second appel ne doit rien changer (déjà posé).
  perform prolonger_recherche_coursier(v_course_id);
  raise notice 'OK : un second appel à prolonger_recherche_coursier reste sans erreur (idempotent).';

  -- === Relances (section 13) ===
  insert into courses (client_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut, created_at)
  values (v_client_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'en_attente', now() - interval '6 minutes')
  returning id into v_course_id;

  select marquer_relances_recherche_dues(v_course_id) into v_dus;
  if not (5 = any(v_dus)) then
    raise exception 'Scénario relance : l''intervalle 5 minutes aurait dû être signalé comme dû (course créée il y a 6 minutes), obtenu %', v_dus;
  end if;
  if 10 = any(v_dus) then
    raise exception 'Scénario relance : l''intervalle 10 minutes n''aurait pas dû être dû (course créée il y a seulement 6 minutes), obtenu %', v_dus;
  end if;
  raise notice 'OK : marquer_relances_recherche_dues signale uniquement l''intervalle 5 minutes pour une course créée il y a 6 minutes.';

  -- Idempotence : un second appel ne doit plus signaler le même intervalle (garde posée).
  select marquer_relances_recherche_dues(v_course_id) into v_dus;
  if array_length(v_dus, 1) is not null then
    raise exception 'Scénario relance : un second appel n''aurait dû signaler aucun intervalle déjà traité, obtenu %', v_dus;
  end if;
  raise notice 'OK : un second appel à marquer_relances_recherche_dues ne resignale pas un intervalle déjà marqué.';

  raise notice '=== Tous les tests sont passés ===';
end $$;

rollback;
```

### Ce que ce script ne peut pas vérifier (nécessite l'app réelle)

Scénarios F et G, qui portent sur le comportement du client dans le temps
(fermeture/réouverture, mise à jour sans action manuelle) plutôt que sur
une seule RPC isolée :

- Scénario F (fermeture/réouverture de l'app) : rouvrir l'écran de suivi
  d'une course `en_attente` créée depuis plus de 4 minutes et confirmer
  que le compteur affiche le temps réellement restant, jamais 15:00.
- Scénario G (coursier accepte pendant que le client regarde l'écran) :
  confirmer que le bottom sheet "Recherche d'un coursier" disparaît dans
  les 3 secondes (prochain poll) sans action manuelle.
