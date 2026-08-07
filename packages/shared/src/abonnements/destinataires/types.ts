export interface CommerceDestinataire {
  id: string;
  commerceId: string;
  nom: string;
  telephone: string;
  adresse: string | null;
  instructions: string | null;
  createdAt: string;
}
