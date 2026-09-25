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

// Comparaison du mois en cours au mois précédent (section 2.L du besoin
// COLIMO PRO Starter : "ajouter une comparaison avec la période précédente
// lorsque suffisamment de données existent"). `variation` est un ratio
// signé (0.2 = +20%) ; null quand le mois précédent n'a aucune donnée
// (rien à comparer, plutôt que d'afficher un +∞ ou un +100% trompeur).
export interface ComparaisonPeriodeCommercant {
  coursesMoisPrecedent: number;
  depensesMoisPrecedent: number;
  variationCourses: number | null;
  variationDepenses: number | null;
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
