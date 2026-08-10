import type { Zone } from "../../types";

// Tableau de bord Starter (section 3.3 du besoin) — mois en cours.
export interface StatistiquesCommercant {
  nombreCoursesMois: number;
  nombreTermineesMois: number;
  nombreAnnuleesMois: number;
  depensesMois: number;
  nombreClientsServis: number;
  nombreEnCours: number;
}

export interface EntreeDestination {
  zone: Zone;
  nombre: number;
}

export interface EntreeEvolutionDepenses {
  mois: string; // "2026-08"
  depenses: number;
}

// Tableau de bord Business (section 4.3) — sur l'ensemble des courses
// fournies à calculerStatistiquesAvanceesCommercant (l'appelant applique le
// filtre de période souhaité avant l'appel, comme getCourses le permet déjà).
export interface StatistiquesAvanceesCommercant {
  depensesTotales: number;
  nombreLivraisons: number;
  dureeLivraisonMoyenneSecondes: number | null;
  tauxReussite: number;
  tauxAnnulation: number;
  principalesDestinations: EntreeDestination[];
  evolutionDepenses: EntreeEvolutionDepenses[];
}
