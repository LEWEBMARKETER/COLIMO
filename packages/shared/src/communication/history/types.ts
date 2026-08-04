import type { CanalCommunication, StatutCommunication } from "../types";

export interface CommunicationEnvoyee {
  id: string;
  utilisateurId: string | null;
  declenchePar: string;
  canal: CanalCommunication;
  destinataire: string;
  modeleCode: string | null;
  contenu: string;
  statut: StatutCommunication;
  erreur: string | null;
  createdAt: string;
  envoyeAt: string | null;
  livreAt: string | null;
  luAt: string | null;
}
