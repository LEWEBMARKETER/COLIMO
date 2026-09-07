-- Gestion complète du statut des coursiers depuis le back-office admin.
--
-- Audit préalable (cf. session) : la quasi-totalité de ce qui était demandé
-- existe déjà — coursiers.statut est déjà LE champ canonique (0023, enum
-- statut_coursier : en_attente_validation/verifie/en_ligne/hors_ligne/
-- suspendu/desactive), historique_coursier journalise déjà les actions
-- (suspension/reactivation/desactivation/changement_statut, 0024),
-- l'admin a déjà pleine écriture RLS sur coursiers (0001) et les colonnes
-- privilégiées sont déjà verrouillées pour tout non-admin (0028). Le
-- front (packages/shared/src/coursiers/statuts, apps/admin coursiers)
-- appelle déjà suspendreCoursier/desactiverCoursier/reactiverCoursier, et
-- la route de suppression de compte (apps/admin/app/api/utilisateurs/[id])
-- gère déjà "tenter une suppression réelle, sinon anonymiser + bannir" pour
-- tout type de compte. La seule lacune de sécurité réelle : rien n'empêche
-- de suspendre/désactiver un coursier qui a une course active en cours.
--
-- Cette migration ajoute uniquement ce garde-fou, au niveau base (donc
-- valable même pour un appel REST direct, pas seulement depuis l'UI admin),
-- sans toucher au reste du modèle existant.

create or replace function bloquer_transition_coursier_course_active()
returns trigger
language plpgsql
as $$
begin
  -- Aucune bascule interne du système ne pose aujourd'hui suspendu/desactive
  -- automatiquement (coursiers_sync_statut ne dérive que en_ligne/hors_ligne
  -- depuis le toggle disponibilité) — ce garde-fou s'applique donc à tout
  -- appelant, y compris admin : la seule façon de suspendre/désactiver un
  -- coursier qui a une course active est de d'abord la réaffecter/terminer.
  if current_setting('colimo.systeme_interne', true) = 'true' then
    return new;
  end if;

  if new.statut in ('suspendu', 'desactive') and old.statut is distinct from new.statut then
    if exists (
      select 1 from courses
      where coursier_id = new.utilisateur_id
        and statut in ('acceptee', 'retrait', 'en_cours')
    ) then
      raise exception 'Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de le suspendre ou de le désactiver.';
    end if;
  end if;

  return new;
end;
$$;

-- Nom choisi pour trier avant "coursiers_sync_statut" et
-- "coursiers_verrouiller_colonnes_privilegiees" (ordre alphabétique des
-- triggers BEFORE UPDATE sur une même table) : peu importe ici puisque ce
-- trigger ne lit que new.statut tel que soumis par l'appelant, mais autant
-- échouer le plus tôt possible dans la chaîne.
drop trigger if exists coursiers_bloquer_transition_course_active on coursiers;
create trigger coursiers_bloquer_transition_course_active
  before update on coursiers
  for each row execute function bloquer_transition_coursier_course_active();
