-- COLIMO TRANSPORT — simplification de l'inscription (3/3) : permet au
-- transporteur propriétaire de repasser son propre dossier (ou un de ses
-- véhicules) de NON_CONFIRME (rejete) à EN_ATTENTE (en_attente) après
-- correction — besoin métier explicite : "après une nouvelle soumission,
-- le statut revient à EN_ATTENTE". Seule cette transition précise est
-- ajoutée aux exceptions déjà posées par les triggers de 0062/0063 :
-- toute auto-validation directe (-> valide) reste bloquée, "Seul un
-- administrateur autorisé peut confirmer un partenaire" (besoin métier)
-- reste donc vrai après cette migration.
--
-- CREATE OR REPLACE sur les DEUX fonctions existantes — repris à
-- l'identique de 0062/0063, seule la clause statut_verification change.
-- Par précaution (cf. régression 0030/0038 de ce même repo, où une
-- redéfinition de trigger avait fait disparaître une protection
-- existante), chaque ligne déjà présente est conservée mot pour mot.

create or replace function proteger_colonnes_privilegiees_transporteurs()
returns trigger
language plpgsql
as $$
declare
  v_resoumission boolean;
begin
  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  v_resoumission := old.statut_verification = 'rejete' and new.statut_verification = 'en_attente';

  if new.statut_verification is distinct from old.statut_verification then
    if not v_resoumission then
      new.statut_verification := old.statut_verification;
    end if;
  end if;
  if new.note_moyenne is distinct from old.note_moyenne then
    new.note_moyenne := old.note_moyenne;
  end if;
  -- Le transporteur ne peut qu'effacer son propre motif (-> null), et
  -- seulement dans le même mouvement qu'une resoumission légitime —
  -- jamais le modifier ni le blanchir sans repasser par en_attente.
  if new.dernier_motif_rejet is distinct from old.dernier_motif_rejet then
    if not (v_resoumission and new.dernier_motif_rejet is null) then
      new.dernier_motif_rejet := old.dernier_motif_rejet;
    end if;
  end if;

  return new;
end;
$$;

create or replace function proteger_colonnes_privilegiees_vehicules_transporteur()
returns trigger
language plpgsql
as $$
declare
  v_resoumission boolean;
begin
  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  v_resoumission := old.statut_verification = 'rejete' and new.statut_verification = 'en_attente';

  if new.statut_verification is distinct from old.statut_verification then
    if not v_resoumission then
      new.statut_verification := old.statut_verification;
    end if;
  end if;
  if new.dernier_motif_rejet is distinct from old.dernier_motif_rejet then
    if not (v_resoumission and new.dernier_motif_rejet is null) then
      new.dernier_motif_rejet := old.dernier_motif_rejet;
    end if;
  end if;

  return new;
end;
$$;
