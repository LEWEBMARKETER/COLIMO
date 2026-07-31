-- Commission de la plateforme calculée automatiquement sur chaque course
-- (15%, cf. COMMISSION_PLATEFORME_TAUX dans packages/shared/src/pricing),
-- quel que soit le mode de paiement (espèces ou mobile money). Colonne
-- générée : toujours cohérente avec le prix, jamais à recalculer ni à
-- synchroniser manuellement côté application.
alter table courses
  add column if not exists commission numeric generated always as (round(prix * 0.15)) stored;
