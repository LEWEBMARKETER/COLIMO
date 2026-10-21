-- COLIMO TRANSPORT — simplification de l'inscription (2/3) : colonnes
-- additives pour le parcours en 3 étapes (infos personnelles / véhicule /
-- documents). Aucune colonne existante modifiée, aucune donnée déjà
-- enregistrée perdue.

alter table transporteurs
  add column quartier text,
  add column permis_conduire_url text,
  -- Acceptation des conditions de partenariat COLIMO TRANSPORT (étape 3) —
  -- distincte des CGU générales déjà acceptées à la création du compte.
  -- "Activation des missions uniquement après confirmation administrative
  -- ET validation contractuelle" (besoin métier) : ce champ est la trace
  -- de la seconde condition, la première restant statut_verification =
  -- 'valide'. Le gating effectif sur les missions n'existe pas encore
  -- (module Demandes/Devis, phase ultérieure) — seule la donnée est
  -- capturée dès maintenant.
  add column conditions_partenariat_acceptees_at timestamptz,
  -- Dénormalisation volontaire du dernier motif de rejet/correction : le
  -- journal complet (historique_transporteur) reste réservé à l'admin
  -- (peut contenir des commentaires internes, même règle que
  -- historique_coursier), mais le transporteur doit pouvoir lire le motif
  -- le concernant pour savoir quoi corriger ("besoin métier : enregistrer
  -- obligatoirement le motif") — déjà lisible via la policy
  -- transporteurs_select_own_or_admin existante, aucune nouvelle policy
  -- nécessaire. Effacé (-> null) uniquement par la resoumission (0067).
  add column dernier_motif_rejet text;

-- Véhicule : photo (déjà demandée dès l'étape 2, "capacité facultative et
-- photo") + deux justificatifs nommés explicitement par le besoin (carte
-- grise, assurance) en colonnes dédiées plutôt que dans le jsonb
-- `documents` générique, qui reste l'extension libre pour les
-- justificatifs complémentaires variables selon la catégorie de véhicule
-- (ex. autorisation de transport de marchandises pour un camion).
alter table vehicules_transporteur
  add column photo_url text,
  add column carte_grise_url text,
  add column assurance_url text,
  add column dernier_motif_rejet text;
