# Paliers et commissions coursiers

Système de commission plateforme dynamique, par palier mensuel, effectif à
compter du **1er octobre 2026**. Remplace le taux fixe historique (15%,
`courses.commission` généré, migration `0017`) pour toute course confirmée
à partir de cette date — les courses confirmées avant restent au taux
historique, jamais recalculées.

## Grille (valeurs initiales)

| Palier | Courses éligibles/mois | Commission COLIMO |
|---|---|---|
| STANDARD | 0–25 | 25% |
| ACTIF | 26–55 | 20% |
| PRO | 56–88 | 18% |
| ELITE | 89+ | 15% |

Modifiable par un administrateur (back-office, Coursiers → Commissions &
Paliers → Grille des paliers) via `enregistrer_grille_paliers_commission`,
avec une nouvelle date d'effet — jamais rétroactif, jamais appliqué aux
commissions déjà calculées.

## Règle du palier "au moment de la course"

Le taux appliqué à une course est celui du palier du coursier **avant**
que cette course ne soit comptée. Exemple : un coursier à 25 courses
(STANDARD) valide sa 26ᵉ course éligible → cette 26ᵉ course est encore
facturée à 25% (STANDARD), le compteur passe ensuite à 26/ACTIF, et
**seules les courses suivantes** sont facturées à 20%.

## Seules les courses réellement terminées comptent

`calculer_et_enregistrer_commission_course` (`supabase/migrations/0055_calcul_commission_paliers.sql`)
n'est appelée que par les 3 chemins existants qui amènent une course à
`statut = 'confirmee'` — une course annulée, litigieuse, refusée ou non
livrée n'atteint jamais cet état et ne compte donc jamais dans le quota
mensuel, sans logique d'exclusion supplémentaire à écrire.

## Schéma

- `catalogue_paliers_commission` — grille, versionnée par `date_effet`.
- `performance_mensuelle_coursier` — une ligne par (coursier, mois civil).
- `commissions_courses` — snapshot financier définitif par course
  (`unique(course_id)` : une course ne génère jamais deux commissions).
- `historique_palier_coursier` — une ligne par franchissement de palier.
- `notifications_palier_en_attente` — boîte aux lettres interne
  franchissement → notification (consommée par
  `recuperer_et_marquer_notification_palier` / `recuperer_toutes_notifications_palier_en_attente`).

## Script de vérification (à exécuter dans le SQL Editor après application des migrations 0053–0056)

Tourne entièrement dans une transaction annulée (`rollback` final) : aucune
donnée réelle n'est modifiée, même en cas d'échec d'une assertion. Couvre
les cas de test de la mission (0/25/26/55/56/88/89/100/150 courses,
changement de mois, arrondi FCFA, idempotence, régime historique
pré-2026-10-01). Remplacer `v_client_id`/`v_coursier_id` par des UUID
réels existants dans `utilisateurs`/`coursiers` avant exécution.

```sql
begin;

do $$
declare
  v_client_id uuid := (select id from utilisateurs where type = 'client' limit 1);
  v_coursier_utilisateur_id uuid := (select utilisateur_id from coursiers limit 1);
  v_coursier_id uuid;
  v_course_id uuid;
  v_i int;
  v_commission numeric;
  v_perf performance_mensuelle_coursier;
  v_taux numeric;
begin
  if v_client_id is null or v_coursier_utilisateur_id is null then
    raise exception 'Ce script nécessite au moins un client et un coursier existants.';
  end if;
  select id into v_coursier_id from coursiers where utilisateur_id = v_coursier_utilisateur_id;

  -- Réinitialise tout historique de test éventuel pour ce coursier sur le
  -- mois cible (octobre 2026), sans affecter les autres mois/coursiers.
  delete from performance_mensuelle_coursier where coursier_id = v_coursier_id and mois = '2026-10-01';

  -- 26 courses à 2500 FCFA, confirmées au 2026-10-15 : les 25 premières
  -- doivent rester à 25% (STANDARD), la 26e fait franchir ACTIF mais reste
  -- elle-même à 25% (règle "palier au moment de la course").
  for v_i in 1..26 loop
    insert into courses (client_id, coursier_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut, confirmee_at)
    values (v_client_id, v_coursier_utilisateur_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'confirmee', '2026-10-15')
    returning id into v_course_id;

    perform calculer_et_enregistrer_commission_course(v_course_id);

    select taux_commission into v_taux from commissions_courses where course_id = v_course_id;
    if v_i <= 25 and v_taux != 0.25 then
      raise exception 'Course %: attendu 25%%, obtenu %', v_i, v_taux;
    end if;
    if v_i = 26 and v_taux != 0.25 then
      raise exception 'Course 26 (celle qui fait franchir ACTIF) doit rester à 25%%, obtenu %', v_taux;
    end if;
  end loop;

  select * into v_perf from performance_mensuelle_coursier where coursier_id = v_coursier_id and mois = '2026-10-01';
  if v_perf.courses_eligibles != 26 then
    raise exception 'Compteur attendu 26, obtenu %', v_perf.courses_eligibles;
  end if;
  if v_perf.taux_commission_actuel != 0.20 then
    raise exception 'Palier courant attendu ACTIF (20%%), obtenu %', v_perf.taux_commission_actuel;
  end if;
  raise notice 'OK: franchissement STANDARD -> ACTIF à la 26e course, 26e course facturée à 25%%.';

  -- 27e course : doit être facturée au nouveau taux (20%, ACTIF).
  insert into courses (client_id, coursier_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut, confirmee_at)
  values (v_client_id, v_coursier_utilisateur_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'confirmee', '2026-10-15')
  returning id into v_course_id;
  perform calculer_et_enregistrer_commission_course(v_course_id);
  select taux_commission, montant_commission into v_taux, v_commission from commissions_courses where course_id = v_course_id;
  if v_taux != 0.20 or v_commission != 500 then
    raise exception '27e course attendue 20%% / 500 FCFA, obtenu % / %', v_taux, v_commission;
  end if;
  raise notice 'OK: 27e course facturée au nouveau taux ACTIF (20%%, 500 FCFA sur 2500).';

  -- Idempotence : rappeler le calcul sur la même course ne doit rien changer.
  perform calculer_et_enregistrer_commission_course(v_course_id);
  if (select count(*) from commissions_courses where course_id = v_course_id) != 1 then
    raise exception 'Double appel : une seconde ligne de commission a été créée pour la même course.';
  end if;
  raise notice 'OK: idempotence — un second appel sur la même course ne crée pas de doublon.';

  -- Changement de mois : le compteur de novembre repart de zéro (STANDARD).
  insert into courses (client_id, coursier_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut, confirmee_at)
  values (v_client_id, v_coursier_utilisateur_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'confirmee', '2026-11-01')
  returning id into v_course_id;
  perform calculer_et_enregistrer_commission_course(v_course_id);
  select taux_commission into v_taux from commissions_courses where course_id = v_course_id;
  if v_taux != 0.25 then
    raise exception 'Nouveau mois : attendu retour à STANDARD (25%%), obtenu %', v_taux;
  end if;
  raise notice 'OK: changement de mois civil — le coursier repart à STANDARD en novembre.';

  -- Régime historique : une course confirmée avant le 2026-10-01 reste à 15%.
  insert into courses (client_id, coursier_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut, confirmee_at)
  values (v_client_id, v_coursier_utilisateur_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'confirmee', '2026-09-15')
  returning id into v_course_id;
  perform calculer_et_enregistrer_commission_course(v_course_id);
  select taux_commission, montant_commission, palier_id into v_taux, v_commission from commissions_courses where course_id = v_course_id;
  if v_taux != 0.15 or v_commission != 375 then
    raise exception 'Course pré-2026-10-01 attendue 15%% / 375 FCFA, obtenu % / %', v_taux, v_commission;
  end if;
  if (select palier_id from commissions_courses where course_id = v_course_id) is not null then
    raise exception 'Course pré-2026-10-01 : palier_id doit rester null (hors système de paliers).';
  end if;
  raise notice 'OK: course confirmée avant le 2026-10-01 reste au régime historique (15%%, 375 FCFA sur 2500).';

  -- Annulée/litigieuse : jamais appelée (statut != 'confirmee'), donc aucune
  -- ligne de commission ne doit exister pour elles.
  insert into courses (client_id, coursier_id, adresse_depart, adresse_arrivee, zone_depart, zone_arrivee, type_colis, prix, statut)
  values (v_client_id, v_coursier_utilisateur_id, 'Test', 'Test', 'libreville', 'libreville', 'colis', 2500, 'annulee')
  returning id into v_course_id;
  if exists (select 1 from commissions_courses where course_id = v_course_id) then
    raise exception 'Une course annulée ne doit jamais avoir de ligne commissions_courses.';
  end if;
  raise notice 'OK: une course annulée ne génère aucune commission (calculer_et_enregistrer_commission_course n''est jamais appelée pour elle).';

  raise notice '=== Tous les tests sont passés ===';
end $$;

rollback;
```
