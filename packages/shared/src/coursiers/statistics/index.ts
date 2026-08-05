import type { Coursier, Utilisateur } from "../../types";
import type { StatistiquesCoursier } from "./types";

export * from "./types";
export * from "./dashboard";

/**
 * Statistiques d'un coursier — fonction pure, lit uniquement les compteurs
 * déjà maintenus en base par les triggers (0023_coursiers_statut_stats.sql).
 * tauxReussite/tauxAnnulation sont exprimés en fraction (0..1), pas en
 * pourcentage — à multiplier par 100 pour l'affichage.
 */
export function calculerStatistiquesCoursier(coursier: Coursier, utilisateur: Utilisateur): StatistiquesCoursier {
  const totalTerminales = coursier.nombreLivraisons + coursier.nombreCoursesAnnulees;
  const tauxReussite = totalTerminales > 0 ? coursier.nombreLivraisons / totalTerminales : 0;
  const tauxAnnulation = totalTerminales > 0 ? coursier.nombreCoursesAnnulees / totalTerminales : 0;
  const dureeLivraisonMoyenneSecondes =
    coursier.nombreLivraisons > 0 ? Math.round(coursier.dureeLivraisonTotaleSecondes / coursier.nombreLivraisons) : null;
  const ancienneteJours = Math.floor((Date.now() - new Date(utilisateur.createdAt).getTime()) / 86_400_000);

  return {
    nombreLivraisons: coursier.nombreLivraisons,
    nombreCoursesAssignees: coursier.nombreCoursesAssignees,
    nombreCoursesAnnulees: coursier.nombreCoursesAnnulees,
    tauxReussite,
    tauxAnnulation,
    noteMoyenne: coursier.noteMoyenne,
    dureeLivraisonMoyenneSecondes,
    ancienneteJours,
  };
}
