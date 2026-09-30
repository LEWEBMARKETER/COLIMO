export interface PalierCommission {
  id: string;
  code: string;
  nom: string;
  seuilMin: number;
  seuilMax: number | null;
  taux: number;
  ordre: number;
  dateEffet: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceMensuelleCoursier {
  id: string;
  coursierId: string;
  mois: string;
  coursesEligibles: number;
  palierId: string | null;
  tauxCommissionActuel: number | null;
  chiffreAffairesBrut: number;
  commissionColimoTotal: number;
  revenusNetCoursier: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionCourse {
  id: string;
  courseId: string;
  coursierId: string;
  montantBrut: number;
  tauxCommission: number;
  montantCommission: number;
  montantNetCoursier: number;
  palierId: string | null;
  calculeAt: string;
  createdAt: string;
}

export interface HistoriquePalierCoursier {
  id: string;
  coursierId: string;
  mois: string;
  palierId: string;
  atteintLe: string;
  createdAt: string;
}

// Entrée envoyée à enregistrer_grille_paliers_commission (RPC) — un seul
// palier de la grille proposée. seuilMax=null uniquement pour le dernier
// (le plus élevé), validé côté serveur.
export interface EntreeGrillePalier {
  code: string;
  nom: string;
  seuilMin: number;
  seuilMax: number | null;
  taux: number;
  ordre: number;
}
