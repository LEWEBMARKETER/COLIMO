import type { Zone } from "../types";

export interface TarifBase {
  min: number;
  max: number;
}

// Grille tarifaire V1 — docs/COLIMO_CONTEXTE_PROJET.md §4
// Clé : "depart|arrivee". Les paires non listées ne sont pas encore desservies.
const GRILLE_TARIFAIRE: Record<string, TarifBase> = {
  "libreville|libreville": { min: 1500, max: 2500 },
  "libreville|owendo": { min: 2500, max: 3000 },
  "libreville|akanda": { min: 2500, max: 3000 },
  "akanda|akanda": { min: 1500, max: 2000 },
  "akanda|libreville": { min: 2500, max: 3000 },
  "akanda|owendo": { min: 3000, max: 3500 },
  "owendo|owendo": { min: 1500, max: 2000 },
  "owendo|libreville": { min: 2500, max: 3000 },
  "libreville|bikele_essassa": { min: 3000, max: 4000 },
  "libreville|ntoum": { min: 5000, max: 5000 },
  "akanda|bikele_essassa": { min: 4000, max: 4500 },
  "owendo|bikele_essassa": { min: 4000, max: 4500 },
  "akanda|ntoum": { min: 6000, max: 6000 },
  "owendo|ntoum": { min: 6000, max: 6000 },
};

export const SUPPLEMENT_PRIORITAIRE = 1000;
export const COMMISSION_PLATEFORME_TAUX = 0.15;

export function getTarifBase(depart: Zone, arrivee: Zone): TarifBase | undefined {
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
  min: number;
  max: number;
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
  const tarif = getTarifBase(depart, arrivee);
  if (!tarif) {
    throw new Error(`Route non desservie : ${depart} -> ${arrivee}`);
  }

  const prixSuggere = Math.round((tarif.min + tarif.max) / 2 / 100) * 100;
  const supplementPrioritaire = options.livraisonPrioritaire ? SUPPLEMENT_PRIORITAIRE : 0;
  const assurance = calculerAssurance(options.valeurDeclaree);

  return {
    min: tarif.min,
    max: tarif.max,
    prixSuggere,
    supplementPrioritaire,
    assurance,
    total: prixSuggere + supplementPrioritaire + assurance,
  };
}

export function calculerCommission(prix: number): number {
  return Math.round(prix * COMMISSION_PLATEFORME_TAUX);
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
