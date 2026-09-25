import type { Course } from "../../types";
import type { ComparaisonPeriodeCommercant, StatistiquesCommercant } from "./types";

export * from "./types";
export * from "./avancees";

const STATUTS_EN_COURS = new Set(["en_attente", "acceptee", "retrait", "en_cours"]);
const STATUTS_TERMINEES = new Set(["livree", "confirmee"]);

function estCeMois(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function estMoisPrecedent(dateIso: string): boolean {
  const d = new Date(dateIso);
  const moisPrecedent = new Date();
  moisPrecedent.setMonth(moisPrecedent.getMonth() - 1);
  return d.getFullYear() === moisPrecedent.getFullYear() && d.getMonth() === moisPrecedent.getMonth();
}

function variation(actuel: number, precedent: number): number | null {
  if (precedent === 0) return null;
  return (actuel - precedent) / precedent;
}

/**
 * Fonction pure — opère sur des courses déjà chargées (aucun accès DB),
 * même contrat que calculerStatistiquesCoursier/calculerTableauDeBordCoursiers
 * (packages/shared/src/coursiers/statistics/). Remplace les calculs inline
 * non mémoïsés de CommerceDashboard.tsx.
 */
export function calculerStatistiquesCommercant(courses: Course[]): StatistiquesCommercant {
  const coursesMois = courses.filter((c) => estCeMois(c.createdAt));
  const termineesMois = coursesMois.filter((c) => STATUTS_TERMINEES.has(c.statut));
  const annuleesMois = coursesMois.filter((c) => c.statut === "annulee");
  const depensesMois = coursesMois.filter((c) => c.statut !== "annulee").reduce((s, c) => s + c.prix, 0);
  const clientsServis = new Set(
    coursesMois.filter((c) => c.telephoneDestinataire).map((c) => c.telephoneDestinataire)
  ).size;
  const enCours = courses.filter((c) => STATUTS_EN_COURS.has(c.statut)).length;

  return {
    nombreCoursesMois: coursesMois.length,
    nombreTermineesMois: termineesMois.length,
    nombreAnnuleesMois: annuleesMois.length,
    depensesMois,
    nombreClientsServis: clientsServis,
    nombreEnCours: enCours,
  };
}

/**
 * Comparaison du mois en cours au mois précédent — même contrat que
 * calculerStatistiquesCommercant (fonction pure, aucun accès DB).
 */
export function calculerComparaisonPeriodeCommercant(courses: Course[]): ComparaisonPeriodeCommercant {
  const coursesMoisPrecedent = courses.filter((c) => estMoisPrecedent(c.createdAt));
  const nombreMoisPrecedent = coursesMoisPrecedent.length;
  const depensesMoisPrecedent = coursesMoisPrecedent.filter((c) => c.statut !== "annulee").reduce((s, c) => s + c.prix, 0);

  const coursesMois = courses.filter((c) => estCeMois(c.createdAt));
  const depensesMois = coursesMois.filter((c) => c.statut !== "annulee").reduce((s, c) => s + c.prix, 0);

  return {
    coursesMoisPrecedent: nombreMoisPrecedent,
    depensesMoisPrecedent,
    variationCourses: variation(coursesMois.length, nombreMoisPrecedent),
    variationDepenses: variation(depensesMois, depensesMoisPrecedent),
  };
}
