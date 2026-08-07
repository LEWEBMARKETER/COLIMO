import type { Zone } from "../types";

// Grille tarifaire V2 — docs/COLIMO_CONTEXTE_PROJET.md §4 (nouvelle grille,
// tarif fixe par trajet — remplace l'ancienne fourchette min/max).
// Clé : "depart|arrivee". Les paires non listées ne sont pas encore desservies.
const GRILLE_TARIFAIRE: Record<string, number> = {
  "libreville|libreville": 2000,
  "libreville|akanda": 3000,
  "libreville|owendo": 3000,
  "libreville|bikele_essassa": 4000,
  "libreville|ntoum": 5000,

  "akanda|libreville": 3000,
  "akanda|owendo": 3500,
  "akanda|akanda": 2000,
  "akanda|bikele_essassa": 4500,
  "akanda|ntoum": 6000,

  "owendo|libreville": 3000,
  "owendo|akanda": 3500,
  "owendo|owendo": 2000,
  "owendo|bikele_essassa": 4500,
  "owendo|ntoum": 6000,
};

export const SUPPLEMENT_PRIORITAIRE = 1000;
export const COMMISSION_PLATEFORME_TAUX = 0.15;

export function getTarifBase(depart: Zone, arrivee: Zone): number | undefined {
  return GRILLE_TARIFAIRE[`${depart}|${arrivee}`];
}

export function isRouteDesservie(depart: Zone, arrivee: Zone): boolean {
  return getTarifBase(depart, arrivee) !== undefined;
}

/**
 * Paliers d'assurance non fixés dans le document de contexte (seule la
 * fourchette 300-1000 FCFA est donnée) — à ajuster avec le métier avant le
 * lancement.
 */
export function calculerAssurance(valeurDeclaree?: number): number {
  if (!valeurDeclaree || valeurDeclaree <= 0) return 0;
  if (valeurDeclaree <= 10_000) return 300;
  if (valeurDeclaree <= 30_000) return 600;
  return 1000;
}

export interface PricingOptions {
  livraisonPrioritaire?: boolean;
  valeurDeclaree?: number;
}

export interface PricingResult {
  prixSuggere: number;
  supplementPrioritaire: number;
  assurance: number;
  total: number;
}

export function calculatePrice(
  depart: Zone,
  arrivee: Zone,
  options: PricingOptions = {}
): PricingResult {
  const prixSuggere = getTarifBase(depart, arrivee);
  if (prixSuggere === undefined) {
    throw new Error(`Route non desservie : ${depart} -> ${arrivee}`);
  }

  const supplementPrioritaire = options.livraisonPrioritaire ? SUPPLEMENT_PRIORITAIRE : 0;
  const assurance = calculerAssurance(options.valeurDeclaree);

  return {
    prixSuggere,
    supplementPrioritaire,
    assurance,
    total: prixSuggere + supplementPrioritaire + assurance,
  };
}

export function calculerCommission(prix: number): number {
  return Math.round(prix * COMMISSION_PLATEFORME_TAUX);
}

// Politique de retour colis : si la livraison échoue et que le colis doit
// être retourné, le client assume 50% du montant de la course.
export const TAUX_FRAIS_RETOUR_COLIS = 0.5;

export function calculerFraisRetour(prix: number): number {
  return Math.round(prix * TAUX_FRAIS_RETOUR_COLIS);
}

export interface CodePromoValidation {
  actif: boolean;
  dateDebut: string | null;
  dateFin: string | null;
  usageMax: number | null;
  usageActuel: number;
}

export function codePromoValide(promo: CodePromoValidation, maintenant: Date = new Date()): boolean {
  if (!promo.actif) return false;
  if (promo.dateDebut && maintenant < new Date(promo.dateDebut)) return false;
  if (promo.dateFin && maintenant > new Date(promo.dateFin)) return false;
  if (promo.usageMax !== null && promo.usageActuel >= promo.usageMax) return false;
  return true;
}

export function calculerReductionPromo(
  total: number,
  promo: { typeReduction: "pourcentage" | "montant_fixe"; valeur: number }
): number {
  const reduction =
    promo.typeReduction === "pourcentage" ? Math.round((total * promo.valeur) / 100) : Math.round(promo.valeur);
  return Math.min(reduction, total);
}
