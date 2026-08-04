import type { CanalCommunication } from "../types";
import type { CommunicationEnvoyee } from "../history/types";

const CANAUX: CanalCommunication[] = ["email", "sms", "whatsapp", "push"];
const STATUTS_REUSSIS = new Set(["envoye", "livre", "lu"]);

export interface StatistiquesCanal {
  canal: CanalCommunication;
  envoyes: number;
  echoues: number;
  livres: number;
  lus: number;
  tauxReussite: number;
}

export interface PointJournalier {
  date: string;
  total: number;
}

export interface StatistiquesCommunication {
  parCanal: Record<CanalCommunication, StatistiquesCanal>;
  total: number;
  parJour: PointJournalier[];
  parMois: PointJournalier[];
  /** Facturation réelle prévue pour une future version (fournisseurs payants non connectés). */
  coutEstime: null;
}

function cleJour(dateIso: string): string {
  return dateIso.slice(0, 10);
}

function cleMois(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function grouperParCle(communications: CommunicationEnvoyee[], cle: (c: CommunicationEnvoyee) => string): PointJournalier[] {
  const compteurs = new Map<string, number>();
  for (const communication of communications) {
    const k = cle(communication);
    compteurs.set(k, (compteurs.get(k) ?? 0) + 1);
  }
  return [...compteurs.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calcule les statistiques du Communication Center à partir de l'historique
 * — fonction pure, réutilisable par n'importe quel écran (dashboard admin,
 * export...). Ne fait aucun appel réseau.
 */
export function calculerStatistiques(communications: CommunicationEnvoyee[]): StatistiquesCommunication {
  const parCanal = Object.fromEntries(
    CANAUX.map((canal) => {
      const sousEnsemble = communications.filter((c) => c.canal === canal);
      const envoyes = sousEnsemble.filter((c) => STATUTS_REUSSIS.has(c.statut)).length;
      const echoues = sousEnsemble.filter((c) => c.statut === "echec").length;
      const livres = sousEnsemble.filter((c) => c.statut === "livre" || c.statut === "lu").length;
      const lus = sousEnsemble.filter((c) => c.statut === "lu").length;
      const tauxReussite = sousEnsemble.length > 0 ? Math.round((envoyes / sousEnsemble.length) * 100) : 0;
      const stats: StatistiquesCanal = { canal, envoyes, echoues, livres, lus, tauxReussite };
      return [canal, stats];
    })
  ) as Record<CanalCommunication, StatistiquesCanal>;

  return {
    parCanal,
    total: communications.length,
    parJour: grouperParCle(communications, (c) => cleJour(c.createdAt)),
    parMois: grouperParCle(communications, (c) => cleMois(c.createdAt)),
    coutEstime: null,
  };
}
