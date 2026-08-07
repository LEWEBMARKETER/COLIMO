import type { SubscriptionPlan } from "../types";

// Sous-ensemble de SubscriptionPlan sans "gratuit" : un forfait ne se
// "demande" ou ne s'"active" jamais vers gratuit (la désactivation y
// ramène directement, cf. administration/index.ts).
export type PackPayant = Exclude<SubscriptionPlan, "gratuit">;

export const PRIX_PACK_STARTER = 10_000;
export const PRIX_PACK_BUSINESS = 25_000;

export const PRIX_PACK: Record<PackPayant, number> = {
  starter: PRIX_PACK_STARTER,
  business: PRIX_PACK_BUSINESS,
};

export type CleFonctionnalitePremium =
  | "carnet_destinataires"
  | "adresses_favorites"
  | "tableau_de_bord_avance"
  | "export_pdf"
  | "notifications_historique"
  | "gestion_equipe"
  | "multi_points_depart"
  | "export_excel"
  | "coursiers_favoris"
  | "support_prioritaire";

export interface FonctionnalitePremium {
  cle: CleFonctionnalitePremium;
  nom: string;
  description: string;
  palierRequis: PackPayant;
}

// Catalogue statique (contenu éditorial, pas des données admin-éditables —
// contrairement aux infos de paiement hors plateforme, cf. paiement/).
// Alimente la section "COLIMO PRO" / matrice ✓ 🔒 du besoin (section 5).
export const CATALOGUE_FONCTIONNALITES_PREMIUM: FonctionnalitePremium[] = [
  {
    cle: "carnet_destinataires",
    nom: "Carnet de destinataires",
    description: "Enregistrez vos clients réguliers (nom, téléphone, adresse, instructions) — jusqu'à 100.",
    palierRequis: "starter",
  },
  {
    cle: "adresses_favorites",
    nom: "Adresses favorites",
    description: "Enregistrez vos adresses fréquentes (boutique, dépôt, fournisseur) — jusqu'à 10.",
    palierRequis: "starter",
  },
  {
    cle: "tableau_de_bord_avance",
    nom: "Tableau de bord avancé",
    description: "Courses du mois, dépenses, clients servis, taux de réussite et d'annulation.",
    palierRequis: "starter",
  },
  {
    cle: "export_pdf",
    nom: "Export PDF",
    description: "Exportez votre historique de livraisons en PDF, filtré par période, statut ou client.",
    palierRequis: "starter",
  },
  {
    cle: "notifications_historique",
    nom: "Notifications et historique",
    description: "Consultez l'historique de vos notifications liées aux livraisons.",
    palierRequis: "starter",
  },
  {
    cle: "gestion_equipe",
    nom: "Gestion des utilisateurs",
    description: "Ajoutez jusqu'à 3 utilisateurs supplémentaires à votre compte commerce.",
    palierRequis: "business",
  },
  {
    cle: "multi_points_depart",
    nom: "Multi-points de départ",
    description: "Enregistrez plusieurs points de récupération et choisissez-en un à chaque course.",
    palierRequis: "business",
  },
  {
    cle: "export_excel",
    nom: "Export Excel",
    description: "Exportez votre historique de livraisons au format Excel.",
    palierRequis: "business",
  },
  {
    cle: "coursiers_favoris",
    nom: "Coursiers favoris",
    description: "Suivez vos coursiers préférés (note, nombre de courses, disponibilité) — sans garantie d'attribution.",
    palierRequis: "business",
  },
  {
    cle: "support_prioritaire",
    nom: "Support prioritaire",
    description: "Vos demandes sont identifiées comme prioritaires auprès de l'équipe COLIMO.",
    palierRequis: "business",
  },
];
