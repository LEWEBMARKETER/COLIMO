import type { VerificationStatus } from "../../types";
import type { StatistiquesCoursier } from "../statistics/types";
import type { BadgeCoursier, BadgeCoursierAttribue } from "./types";

export interface ResultatEvaluationBadges {
  aAttribuer: BadgeCoursier[];
  aRetirer: BadgeCoursierAttribue[];
}

function badgeEligible(badge: BadgeCoursier, stats: StatistiquesCoursier, statutVerification: VerificationStatus): boolean {
  const { regle } = badge;

  if (regle.type === "verification_dossier") return statutVerification === "valide";

  // Un badge "seuils_statistiques" sans aucun seuil défini n'est jamais
  // éligible : évite qu'un badge mal configuré (regle vide) s'attribue à
  // tout le monde.
  const seuils = [
    regle.nombreLivraisonsMin,
    regle.noteMoyenneMin,
    regle.tauxAnnulationMax,
    regle.dureeLivraisonMoyenneMaxSecondes,
  ];
  if (seuils.every((s) => s === undefined)) return false;

  if (typeof regle.nombreLivraisonsMin === "number" && stats.nombreLivraisons < regle.nombreLivraisonsMin) return false;
  if (typeof regle.noteMoyenneMin === "number" && stats.noteMoyenne < regle.noteMoyenneMin) return false;
  if (typeof regle.tauxAnnulationMax === "number" && stats.tauxAnnulation > regle.tauxAnnulationMax) return false;
  if (
    typeof regle.dureeLivraisonMoyenneMaxSecondes === "number" &&
    (stats.dureeLivraisonMoyenneSecondes === null || stats.dureeLivraisonMoyenneSecondes > regle.dureeLivraisonMoyenneMaxSecondes)
  ) {
    return false;
  }

  return true;
}

/**
 * Compare les statistiques actuelles d'un coursier au catalogue de badges
 * automatiques et détermine ce qui doit être attribué/retiré. Fonction pure
 * — aucun accès DB, ne fait qu'évaluer les règles fournies en paramètre
 * (elles-mêmes chargées depuis catalogue_badges, éditable en admin).
 */
export function evaluerBadgesAutomatiques(
  stats: StatistiquesCoursier,
  statutVerification: VerificationStatus,
  catalogue: BadgeCoursier[],
  badgesActuels: BadgeCoursierAttribue[]
): ResultatEvaluationBadges {
  const idsBadgesActuels = new Set(badgesActuels.map((b) => b.badgeId));
  const aAttribuer: BadgeCoursier[] = [];
  const aRetirer: BadgeCoursierAttribue[] = [];

  for (const badge of catalogue) {
    if (!badge.actif || badge.modeAttribution !== "automatique") continue;
    const eligible = badgeEligible(badge, stats, statutVerification);
    const possedeDeja = idsBadgesActuels.has(badge.id);

    if (eligible && !possedeDeja) {
      aAttribuer.push(badge);
    } else if (!eligible && possedeDeja) {
      const attribution = badgesActuels.find((b) => b.badgeId === badge.id);
      if (attribution) aRetirer.push(attribution);
    }
  }

  return { aAttribuer, aRetirer };
}
