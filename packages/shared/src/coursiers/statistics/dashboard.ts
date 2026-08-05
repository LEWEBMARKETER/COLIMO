import type { StatutCoursierEffectif } from "../../types";
import type { NiveauCoursier } from "../niveaux/types";
import type { CoursierAvecStatutEffectif } from "../statuts";
import type { EntreeClassementCoursier, TableauDeBordCoursiers } from "./types";

const STATUTS_EFFECTIFS: StatutCoursierEffectif[] = [
  "en_attente_validation",
  "verifie",
  "en_ligne",
  "occupe",
  "hors_ligne",
  "suspendu",
  "desactive",
];

function nomAffiche(c: CoursierAvecStatutEffectif): string {
  return c.utilisateur.prenom ? `${c.utilisateur.prenom} ${c.utilisateur.nom}` : c.utilisateur.nom;
}

function classement(
  coursiers: CoursierAvecStatutEffectif[],
  valeur: (c: CoursierAvecStatutEffectif) => number,
  croissant = false
): EntreeClassementCoursier[] {
  return [...coursiers]
    .sort((a, b) => (croissant ? valeur(a) - valeur(b) : valeur(b) - valeur(a)))
    .slice(0, 10)
    .map((c) => ({ coursierId: c.utilisateurId, nom: nomAffiche(c), valeur: valeur(c) }));
}

/**
 * Agrège le tableau de bord Coursiers — fonction pure, opère sur des
 * données déjà chargées (aucun accès DB), réutilisable partout où un
 * résumé est nécessaire.
 */
export function calculerTableauDeBordCoursiers(
  coursiers: CoursierAvecStatutEffectif[],
  niveaux: NiveauCoursier[],
  nombreBadgesAttribues: number,
  seuilMinimumLivraisonsClassement = 5
): TableauDeBordCoursiers {
  const parStatut = Object.fromEntries(
    STATUTS_EFFECTIFS.map((s) => [s, coursiers.filter((c) => c.statutEffectif === s).length])
  ) as Record<StatutCoursierEffectif, number>;

  const parNiveau: Record<string, number> = {};
  for (const niveau of niveaux) {
    parNiveau[niveau.code] = coursiers.filter((c) => c.niveauId === niveau.id).length;
  }

  const eligiblesClassement = coursiers.filter((c) => c.nombreLivraisons >= seuilMinimumLivraisonsClassement);

  return {
    parStatut,
    parNiveau,
    nombreBadgesAttribues,
    topMeilleurs: classement(coursiers, (c) => c.nombreLivraisons),
    topRapides: classement(eligiblesClassement, (c) => c.dureeLivraisonTotaleSecondes / c.nombreLivraisons, true),
    topMieuxNotes: classement(eligiblesClassement, (c) => c.noteMoyenne),
  };
}
