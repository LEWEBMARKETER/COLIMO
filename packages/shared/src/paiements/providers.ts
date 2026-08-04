// Le module de paiement est indépendant du module des commandes : celui-ci
// ne connaît que "un paiement est confirmé ou non", jamais comment. Le
// fournisseur ci-dessous est manuel (Phase 1 — aucun agrégateur, aucune API
// Airtel Money). Migrer vers un vrai fournisseur plus tard consiste à
// implémenter FournisseurPaiement et appeler configurerFournisseurPaiement
// une fois au démarrage de l'app — aucun autre fichier n'a besoin de changer.

export const COMPTE_AIRTEL_MONEY_COLIMO = {
  numero: "074 01 57 99",
  titulaire: "Orley MOUSSAVOU",
};

export interface InstructionsPaiement {
  numero: string;
  titulaire: string;
  instructions: string;
}

export interface FournisseurPaiement {
  nom: string;
  /** Informations à afficher au client pour effectuer le paiement. */
  obtenirInstructions(montant: string, reference: string): InstructionsPaiement;
}

const fournisseurManuelAirtelMoney: FournisseurPaiement = {
  nom: "Airtel Money (paiement manuel)",
  obtenirInstructions(montant, reference) {
    return {
      numero: COMPTE_AIRTEL_MONEY_COLIMO.numero,
      titulaire: COMPTE_AIRTEL_MONEY_COLIMO.titulaire,
      instructions:
        `Envoyez ${montant} au ${COMPTE_AIRTEL_MONEY_COLIMO.numero} (${COMPTE_AIRTEL_MONEY_COLIMO.titulaire}) via Airtel Money, ` +
        `puis indiquez la référence ${reference} ci-dessous une fois le paiement effectué.`,
    };
  },
};

let fournisseurActif: FournisseurPaiement = fournisseurManuelAirtelMoney;

export function configurerFournisseurPaiement(fournisseur: FournisseurPaiement): void {
  fournisseurActif = fournisseur;
}

export function getFournisseurPaiement(): FournisseurPaiement {
  return fournisseurActif;
}
