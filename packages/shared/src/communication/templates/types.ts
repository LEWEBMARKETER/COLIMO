import type { CanalCommunication } from "../types";

export interface ModeleCommunication {
  id: string;
  code: string;
  canal: CanalCommunication;
  nom: string;
  sujet: string | null;
  contenu: string;
  variables: string[];
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}
