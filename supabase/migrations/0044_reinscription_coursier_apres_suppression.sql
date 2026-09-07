-- Permet à un coursier supprimé par un admin de recréer un nouveau compte
-- 24h après la suppression (réelle ou anonymisation, cf. 0036 et
-- apps/admin/app/api/utilisateurs/[id]/route.ts).
--
-- historique_suppressions_compte (0036) enregistre déjà le numéro de
-- téléphone et l'horodatage de CHAQUE suppression, réelle comme anonymisée
-- — rien à recréer côté journal, seulement le garde-fou temporel.

alter table historique_suppressions_compte
  add column if not exists email_original text;

create or replace function bloquer_reinscription_coursier_recent()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'coursier' and exists (
    select 1 from historique_suppressions_compte
    where type_compte = 'coursier'
      and telephone_original = new.telephone
      and created_at > now() - interval '24 hours'
  ) then
    raise exception 'Ce numéro de téléphone correspond à un compte coursier supprimé récemment — vous pourrez recréer un compte 24 heures après la suppression.';
  end if;
  return new;
end;
$$;

drop trigger if exists utilisateurs_bloquer_reinscription_coursier on utilisateurs;
create trigger utilisateurs_bloquer_reinscription_coursier
  before insert on utilisateurs
  for each row execute function bloquer_reinscription_coursier_recent();
