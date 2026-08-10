// Instructions de paiement hors plateforme (Airtel Money, Moov Money,
// virement...) — ligne unique, admin-éditable, jamais codée en dur
// (contrairement à COMPTE_AIRTEL_MONEY_COLIMO dans packages/shared/src/paiements,
// qui lui reste hardcodé pour la déclaration de paiement des courses ; ce
// module suit explicitement la demande "ne pas coder en dur le numéro"
// pour les abonnements).
export interface ConfigurationPaiementAbonnement {
  numeroPaiement: string;
  nomBeneficiaire: string;
  moyenPaiement: string;
  instructions: string;
  whatsapp: string;
  emailContact: string;
  updatedAt: string;
}
