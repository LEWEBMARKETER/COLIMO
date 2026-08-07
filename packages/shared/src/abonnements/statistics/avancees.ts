import type { Course, Zone } from "../../types";
import type { EntreeDestination, EntreeEvolutionDepenses, StatistiquesAvanceesCommercant } from "./types";

const STATUTS_TERMINEES = new Set(["livree", "confirmee"]);

/**
 * Fonction pure — sur des courses déjà chargées. L'appelant applique le
 * filtre de période souhaité avant l'appel (les fonctions ne font aucune
 * hypothèse de fenêtre temporelle, contrairement à calculerStatistiquesCommercant
 * qui, elle, est explicitement "mois en cours").
 */
export function calculerStatistiquesAvanceesCommercant(courses: Course[]): StatistiquesAvanceesCommercant {
  const terminees = courses.filter((c) => STATUTS_TERMINEES.has(c.statut));
  const annulees = courses.filter((c) => c.statut === "annulee");
  const termineesOuAnnulees = terminees.length + annulees.length;

  const depensesTotales = courses.filter((c) => c.statut !== "annulee").reduce((s, c) => s + c.prix, 0);

  const dureesSecondes = terminees
    .filter((c) => c.accepteeAt && c.livreeAt)
    .map((c) => (new Date(c.livreeAt as string).getTime() - new Date(c.accepteeAt as string).getTime()) / 1000);
  const dureeLivraisonMoyenneSecondes =
    dureesSecondes.length > 0 ? Math.round(dureesSecondes.reduce((s, d) => s + d, 0) / dureesSecondes.length) : null;

  const tauxReussite = termineesOuAnnulees > 0 ? terminees.length / termineesOuAnnulees : 0;
  const tauxAnnulation = termineesOuAnnulees > 0 ? annulees.length / termineesOuAnnulees : 0;

  const parDestination = new Map<Zone, number>();
  for (const c of courses) {
    parDestination.set(c.zoneArrivee, (parDestination.get(c.zoneArrivee) ?? 0) + 1);
  }
  const principalesDestinations: EntreeDestination[] = [...parDestination.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([zone, nombre]) => ({ zone, nombre }));

  const parMois = new Map<string, number>();
  for (const c of courses) {
    if (c.statut === "annulee") continue;
    const d = new Date(c.createdAt);
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    parMois.set(cle, (parMois.get(cle) ?? 0) + c.prix);
  }
  const evolutionDepenses: EntreeEvolutionDepenses[] = [...parMois.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mois, depenses]) => ({ mois, depenses }));

  return {
    depensesTotales,
    nombreLivraisons: terminees.length,
    dureeLivraisonMoyenneSecondes,
    tauxReussite,
    tauxAnnulation,
    principalesDestinations,
    evolutionDepenses,
  };
}
