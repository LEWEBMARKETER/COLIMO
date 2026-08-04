import type { EmailProvider, PushProvider, ResultatEnvoi, SMSProvider, WhatsAppProvider } from "./types";

// packages/shared cible ES2020 sans lib DOM/Node : console existe bien à
// l'exécution (RN, navigateur, Node) mais pas dans les types disponibles ici.
declare const console: { log: (...args: unknown[]) => void };

// Fournisseurs de secours : n'appellent aucun service externe, journalisent
// simplement l'envoi et répondent systématiquement avec succès. Servent de
// référence pour implémenter un vrai fournisseur plus tard (même contrat).
// Aucun fournisseur réel n'est connecté pour le moment (Phase 1) — cf.
// docs/COMMUNICATION_CENTER.md pour la marche à suivre.
async function simulerEnvoi(nom: string, destinataire: string, contenu: string): Promise<ResultatEnvoi> {
  // eslint-disable-next-line no-console
  console.log(`[communication] ${nom} → ${destinataire}\n${contenu}`);
  return { succes: true, referenceExterne: `mock-${Date.now()}` };
}

export const MockEmailProvider: EmailProvider = {
  nom: "Email (mock)",
  async envoyer({ destinataire, sujet, contenu }) {
    return simulerEnvoi(this.nom, destinataire, `[${sujet}]\n${contenu}`);
  },
};

export const MockSMSProvider: SMSProvider = {
  nom: "SMS (mock)",
  async envoyer({ destinataire, contenu }) {
    return simulerEnvoi(this.nom, destinataire, contenu);
  },
};

export const MockWhatsAppProvider: WhatsAppProvider = {
  nom: "WhatsApp (mock)",
  async envoyer({ destinataire, contenu }) {
    return simulerEnvoi(this.nom, destinataire, contenu);
  },
};

export const MockPushProvider: PushProvider = {
  nom: "Push (mock)",
  async envoyer({ destinataire, titre, contenu }) {
    return simulerEnvoi(this.nom, destinataire, titre ? `${titre} — ${contenu}` : contenu);
  },
};
