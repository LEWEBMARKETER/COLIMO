import type { SupabaseClient } from "@supabase/supabase-js";
import { getCoursiers, patchCoursier, type CoursierAvecUtilisateur } from "../../supabase/queries";
import type { Coursier, StatutCoursier, StatutCoursierEffectif } from "../../types";
import { ajouterEntreeHistorique } from "../historique";
import { recalculerBadgesEtNiveau } from "../automation";

export interface CoursierAvecStatutEffectif extends CoursierAvecUtilisateur {
  statutEffectif: StatutCoursierEffectif;
}

/**
 * "Occupé" n'est jamais stocké en base (cf. migration 0023) — c'est un
 * état dérivé, calculé ici en fonction de si le coursier a une course
 * active. Ne pas confondre avec statutVerification/disponibilite qui
 * restent des colonnes internes synchronisées automatiquement.
 */
export function calculerStatutEffectif(statut: StatutCoursier, aCourseEnCours: boolean): StatutCoursierEffectif {
  return statut === "en_ligne" && aCourseEnCours ? "occupe" : statut;
}

async function getCoursierIdsAvecCourseActive(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client
    .from("courses")
    .select("coursier_id")
    .in("statut", ["acceptee", "retrait", "en_cours"])
    .not("coursier_id", "is", null);
  if (error) throw error;
  return new Set((data as { coursier_id: string }[]).map((r) => r.coursier_id));
}

export async function getCoursiersAvecStatutEffectif(client: SupabaseClient): Promise<CoursierAvecStatutEffectif[]> {
  const [coursiers, idsActifs] = await Promise.all([getCoursiers(client), getCoursierIdsAvecCourseActive(client)]);
  return coursiers.map((c) => ({
    ...c,
    statutEffectif: calculerStatutEffectif(c.statut, idsActifs.has(c.utilisateurId)),
  }));
}

export async function changerStatutCoursier(
  client: SupabaseClient,
  coursierId: string,
  nouveauStatut: StatutCoursier,
  params: { administrateurId: string; ancienStatut?: StatutCoursier; motif?: string; commentaire?: string }
): Promise<Coursier> {
  const coursier = await patchCoursier(client, coursierId, { statut: nouveauStatut });
  await ajouterEntreeHistorique(client, {
    coursierId,
    action: "changement_statut",
    ancienneValeur: params.ancienStatut ?? null,
    nouvelleValeur: nouveauStatut,
    motif: params.motif ?? null,
    commentaire: params.commentaire ?? null,
    administrateurId: params.administrateurId,
  });
  return coursier;
}

export async function suspendreCoursier(
  client: SupabaseClient,
  coursierId: string,
  params: { administrateurId: string; motif: string; commentaire?: string }
): Promise<Coursier> {
  const coursier = await patchCoursier(client, coursierId, { statut: "suspendu" });
  await ajouterEntreeHistorique(client, {
    coursierId,
    action: "suspension",
    nouvelleValeur: "suspendu",
    motif: params.motif,
    commentaire: params.commentaire ?? null,
    administrateurId: params.administrateurId,
  });
  return coursier;
}

export async function reactiverCoursier(
  client: SupabaseClient,
  coursierId: string,
  params: { administrateurId: string; commentaire?: string }
): Promise<Coursier> {
  const coursier = await patchCoursier(client, coursierId, { statut: "hors_ligne" });
  await ajouterEntreeHistorique(client, {
    coursierId,
    action: "reactivation",
    nouvelleValeur: "hors_ligne",
    commentaire: params.commentaire ?? null,
    administrateurId: params.administrateurId,
  });
  return coursier;
}

export async function desactiverCoursier(
  client: SupabaseClient,
  coursierId: string,
  params: { administrateurId: string; motif?: string; commentaire?: string }
): Promise<Coursier> {
  const coursier = await patchCoursier(client, coursierId, { statut: "desactive" });
  await ajouterEntreeHistorique(client, {
    coursierId,
    action: "desactivation",
    nouvelleValeur: "desactive",
    motif: params.motif ?? null,
    commentaire: params.commentaire ?? null,
    administrateurId: params.administrateurId,
  });
  return coursier;
}

/**
 * Valide le dossier — statutVerification -> "valide" fait automatiquement
 * suivre statut -> "verifie" via le trigger coursiers_sync_statut (0023),
 * pas besoin de le patcher explicitement ici. Déclenche aussi le recalcul
 * automatique (badge "Coursier Vérifié" notamment).
 */
export async function validerDossierCoursier(
  client: SupabaseClient,
  coursierId: string,
  administrateurId: string
): Promise<Coursier> {
  const coursier = await patchCoursier(client, coursierId, { statutVerification: "valide" });
  await ajouterEntreeHistorique(client, {
    coursierId,
    action: "validation_dossier",
    nouvelleValeur: "valide",
    administrateurId,
  });
  await recalculerBadgesEtNiveau(client, coursier.utilisateurId);
  return coursier;
}

export async function rejeterDossierCoursier(
  client: SupabaseClient,
  coursierId: string,
  administrateurId: string,
  motif?: string
): Promise<Coursier> {
  const coursier = await patchCoursier(client, coursierId, { statutVerification: "rejete" });
  await ajouterEntreeHistorique(client, {
    coursierId,
    action: "rejet_dossier",
    nouvelleValeur: "rejete",
    motif: motif ?? null,
    administrateurId,
  });
  return coursier;
}

/**
 * N'altère pas le statut — journalise seulement la demande (le suivi se
 * fait aujourd'hui hors application, par contact direct du coursier).
 */
export async function demanderDocumentsComplementaires(
  client: SupabaseClient,
  coursierId: string,
  administrateurId: string,
  commentaire?: string
): Promise<void> {
  await ajouterEntreeHistorique(client, {
    coursierId,
    action: "commentaire_interne",
    commentaire: commentaire ?? "Documents complémentaires demandés",
    administrateurId,
  });
}
