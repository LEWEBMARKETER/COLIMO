export type ModeAttributionBadge = "automatique" | "manuel";

export const MODE_ATTRIBUTION_BADGE_LABELS: Record<ModeAttributionBadge, string> = {
  automatique: "Automatique",
  manuel: "Manuel",
};

// Seuils d'attribution automatique — tous optionnels, un badge peut n'en
// définir qu'une partie. `type` documente l'intention mais n'est pas
// interprété strictement : evaluerBadgesAutomatiques() se contente de
// vérifier les seuils présents, quel que soit `type`.
export interface RegleBadge {
  type?: string;
  nombreLivraisonsMin?: number;
  noteMoyenneMin?: number;
  tauxAnnulationMax?: number;
  dureeLivraisonMoyenneMaxSecondes?: number;
  condition?: string;
}

export interface BadgeCoursier {
  id: string;
  code: string;
  nom: string;
  icone: string;
  description: string;
  couleur: string;
  modeAttribution: ModeAttributionBadge;
  regle: RegleBadge;
  actif: boolean;
  ordreAffichage: number;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeCoursierAttribue {
  id: string;
  coursierId: string;
  badgeId: string;
  attribueLe: string;
  expireLe: string | null;
  attribuePar: string | null;
  retireLe: string | null;
  retirePar: string | null;
  createdAt: string;
}
