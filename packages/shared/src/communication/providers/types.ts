// Contrats que doit respecter tout fournisseur — un par canal, plutôt qu'une
// seule interface générique : un email a un sujet, un push a un titre, un
// SMS/WhatsApp n'ont ni l'un ni l'autre. Le reste de l'application ne
// connaît jamais ces interfaces directement : seul
// packages/shared/src/communication/service.ts (via le registre de
// settings/) y fait appel.

export interface ResultatEnvoi {
  succes: boolean;
  referenceExterne?: string;
  erreur?: string;
}

export interface EmailProvider {
  nom: string;
  envoyer(params: { destinataire: string; sujet: string; contenu: string }): Promise<ResultatEnvoi>;
}

export interface SMSProvider {
  nom: string;
  envoyer(params: { destinataire: string; contenu: string }): Promise<ResultatEnvoi>;
}

export interface WhatsAppProvider {
  nom: string;
  envoyer(params: { destinataire: string; contenu: string }): Promise<ResultatEnvoi>;
}

export interface PushProvider {
  nom: string;
  envoyer(params: { destinataire: string; titre?: string; contenu: string }): Promise<ResultatEnvoi>;
}
