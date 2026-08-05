import type { StatutCoursierEffectif } from "../../types";

export interface StatistiquesCoursier {
  nombreLivraisons: number;
  nombreCoursesAssignees: number;
  nombreCoursesAnnulees: number;
  tauxReussite: number;
  tauxAnnulation: number;
  noteMoyenne: number;
  dureeLivraisonMoyenneSecondes: number | null;
  ancienneteJours: number;
}

export interface EntreeClassementCoursier {
  coursierId: string;
  nom: string;
  valeur: number;
}

export interface TableauDeBordCoursiers {
  parStatut: Record<StatutCoursierEffectif, number>;
  parNiveau: Record<string, number>;
  nombreBadgesAttribues: number;
  topMeilleurs: EntreeClassementCoursier[];
  topRapides: EntreeClassementCoursier[];
  topMieuxNotes: EntreeClassementCoursier[];
}
