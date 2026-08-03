import type { TypeNotification } from "./types";

// packages/shared cible ES2020 sans lib DOM/Node : console existe bien à
// l'exécution (RN, navigateur, Node) mais pas dans les types disponibles ici.
declare const console: { log: (...args: unknown[]) => void };

// Contrat que doit respecter tout fournisseur (SMS, WhatsApp, Email, Push).
// Le reste de l'application ne connaît jamais cette interface directement :
// seul packages/shared/src/notifications/service.ts (via getFournisseur) y
// fait appel.
export interface ResultatEnvoiNotification {
  succes: boolean;
  referenceExterne?: string;
  erreur?: string;
}

export interface FournisseurNotification {
  nom: string;
  envoyer(params: { destinataire: string; sujet?: string; contenu: string }): Promise<ResultatEnvoiNotification>;
}

// Fournisseur de secours : n'appelle aucun service externe, journalise
// simplement l'envoi et répond systématiquement avec succès. Sert de
// référence pour implémenter un vrai fournisseur plus tard (même contrat).
function creerFournisseurMock(nom: string): FournisseurNotification {
  return {
    nom,
    async envoyer({ destinataire, contenu }) {
      // eslint-disable-next-line no-console
      console.log(`[notifications] ${nom} → ${destinataire}\n${contenu}`);
      return { succes: true, referenceExterne: `mock-${Date.now()}` };
    },
  };
}

export const fournisseurSmsMock = creerFournisseurMock("SMS (mock)");
export const fournisseurWhatsAppMock = creerFournisseurMock("WhatsApp (mock)");
export const fournisseurEmailMock = creerFournisseurMock("Email (mock)");
export const fournisseurPushMock = creerFournisseurMock("Push (mock)");

// Registre des fournisseurs actifs, un par canal. Remplacer un fournisseur
// (ex. brancher Meta WhatsApp Business Platform) se fait en un seul appel à
// configurerFournisseur, au démarrage de l'application — aucune autre partie
// du code n'a besoin d'être modifiée.
const registre: Record<TypeNotification, FournisseurNotification> = {
  sms: fournisseurSmsMock,
  whatsapp: fournisseurWhatsAppMock,
  email: fournisseurEmailMock,
  push: fournisseurPushMock,
};

export function configurerFournisseur(type: TypeNotification, fournisseur: FournisseurNotification): void {
  registre[type] = fournisseur;
}

export function getFournisseur(type: TypeNotification): FournisseurNotification {
  return registre[type];
}
