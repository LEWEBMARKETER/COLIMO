-- Le profil commerçant (mobile) permet désormais au commerçant de modifier
-- sa propre fiche (adresse, responsable, whatsapp, activité, volume,
-- photo) via upsertCommercant — ce chemin d'auto-édition existait déjà
-- côté admin mais est maintenant accessible depuis l'app côté commerçant.
-- commercants_update_own_or_admin (RLS, 0011) autorise déjà le
-- propriétaire à écrire n'importe quelle colonne de sa propre ligne ;
-- proteger_colonnes_privilegiees_commercants (0031) verrouille les 4
-- colonnes d'abonnement mais pas commission_taux, qui devrait rester
-- exclusivement fixé par l'admin (comme les autres colonnes de confiance
-- verrouillées dans l'audit de sécurité 0028-0030).

create or replace function proteger_colonnes_privilegiees_commercants()
returns trigger
language plpgsql
as $$
begin
  if current_setting('colimo.systeme_interne', true) = 'true' then
    return new;
  end if;

  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  if new.subscription_plan is distinct from old.subscription_plan then
    new.subscription_plan := old.subscription_plan;
  end if;
  if new.abonnement_debute_le is distinct from old.abonnement_debute_le then
    new.abonnement_debute_le := old.abonnement_debute_le;
  end if;
  if new.abonnement_expire_le is distinct from old.abonnement_expire_le then
    new.abonnement_expire_le := old.abonnement_expire_le;
  end if;
  if new.abonnement_suspendu is distinct from old.abonnement_suspendu then
    new.abonnement_suspendu := old.abonnement_suspendu;
  end if;
  if new.commission_taux is distinct from old.commission_taux then
    new.commission_taux := old.commission_taux;
  end if;

  return new;
end;
$$;
