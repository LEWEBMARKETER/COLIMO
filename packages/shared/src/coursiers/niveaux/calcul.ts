import type { NiveauCoursier } from "./types";

/**
 * Détermine le niveau d'un coursier à partir de son nombre de livraisons —
 * fonction pure, ne fait aucun accès DB. Les paliers sont chargés depuis
 * catalogue_niveaux (éditable en admin), jamais codés en dur ici.
 */
export function calculerNiveau(nombreLivraisons: number, paliers: NiveauCoursier[]): NiveauCoursier | null {
  const eligibles = paliers.filter((p) => nombreLivraisons >= p.seuilLivraisonsMin);
  if (eligibles.length === 0) return null;
  return eligibles.reduce((meilleur, actuel) => (actuel.ordre > meilleur.ordre ? actuel : meilleur));
}
