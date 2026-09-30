import type { PalierCommission } from "./types";

export interface ProgressionPalier {
  palierActuel: PalierCommission | null;
  prochainPalier: PalierCommission | null;
  coursesRestantes: number | null;
}

/**
 * Progression vers le prochain palier — fonction pure, affichage uniquement
 * (barre de progression espace coursier / back-office). Le calcul financier
 * réel (taux appliqué à chaque course) reste exclusivement côté base de
 * données (calculer_et_enregistrer_commission_course, 0055) : cette
 * fonction ne doit jamais servir à déterminer une commission.
 */
export function calculerProgressionPalier(coursesEligibles: number, paliers: PalierCommission[]): ProgressionPalier {
  const tries = [...paliers].sort((a, b) => a.ordre - b.ordre);
  const palierActuel =
    tries.filter((p) => coursesEligibles >= p.seuilMin).reduce((meilleur: PalierCommission | null, actuel) => {
      if (!meilleur) return actuel;
      return actuel.ordre > meilleur.ordre ? actuel : meilleur;
    }, null) ?? null;

  const prochainPalier = palierActuel ? tries.find((p) => p.ordre === palierActuel.ordre + 1) ?? null : tries[0] ?? null;

  const coursesRestantes = prochainPalier ? Math.max(prochainPalier.seuilMin - coursesEligibles, 0) : null;

  return { palierActuel, prochainPalier, coursesRestantes };
}
