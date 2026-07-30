-- La FAQ/CGU officielles listent "retard important" comme motif de litige,
-- en plus des motifs déjà couverts par litige_motif (migration 0015).
alter type litige_motif add value if not exists 'retard_important';
