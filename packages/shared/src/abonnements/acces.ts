import type { Commercant, SubscriptionPlan } from "../types";
import { CATALOGUE_FONCTIONNALITES_PREMIUM, type CleFonctionnalitePremium } from "./types";

const ORDRE_PALIER: Record<SubscriptionPlan, number> = { gratuit: 0, starter: 1, business: 2 };

type CommercantAbonnement = Pick<Commercant, "subscriptionPlan" | "abonnementExpireLe" | "abonnementSuspendu">;

/**
 * Dérive le palier RÉELLEMENT applicable — jamais stocké tel quel.
 * subscriptionPlan garde la trace de "ce qui a été activé en dernier" même
 * après expiration/suspension ; c'est cette fonction (et son équivalent
 * SQL plan_effectif_commerce, migration 0032) qui retombe à "gratuit" le
 * cas échéant. Toujours vérifiée aussi côté serveur (RLS/triggers) — cette
 * version ne pilote que l'affichage.
 */
export function calculerPlanEffectif(commercant: CommercantAbonnement): SubscriptionPlan {
  if (commercant.abonnementSuspendu) return "gratuit";
  if (commercant.subscriptionPlan === "gratuit") return "gratuit";
  if (!commercant.abonnementExpireLe) return "gratuit";
  return new Date(commercant.abonnementExpireLe).getTime() > Date.now() ? commercant.subscriptionPlan : "gratuit";
}

export function peutAccederFonctionnalite(planEffectif: SubscriptionPlan, cle: CleFonctionnalitePremium): boolean {
  const fonctionnalite = CATALOGUE_FONCTIONNALITES_PREMIUM.find((f) => f.cle === cle);
  if (!fonctionnalite) return true;
  return ORDRE_PALIER[planEffectif] >= ORDRE_PALIER[fonctionnalite.palierRequis];
}

// Null si aucun abonnement payant en cours (rien à annoncer). Peut être
// négatif si l'abonnement est déjà expiré (le compte est alors déjà
// retombé à "gratuit" via calculerPlanEffectif — utilisé uniquement pour
// la bannière "expire dans X jours", jamais pour la logique d'accès).
export function joursAvantExpiration(commercant: Pick<Commercant, "abonnementExpireLe">): number | null {
  if (!commercant.abonnementExpireLe) return null;
  const diffMs = new Date(commercant.abonnementExpireLe).getTime() - Date.now();
  return Math.ceil(diffMs / 86_400_000);
}
