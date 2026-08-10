import type { SupabaseClient } from "@supabase/supabase-js";
import { courseFromRow, historiqueAnnulationFromRow, type CourseRow, type HistoriqueAnnulationRow } from "../supabase/mappers";
import type { Course, CourseStatus, ResolutionLitige } from "../types";
import type { HistoriqueAnnulation } from "./types";

export * from "./types";

// Statuts dans lesquels un client peut encore annuler sa propre course —
// dès que le coursier a récupéré le colis (passage à "en_cours"), la
// fenêtre se ferme. Vérifié aussi côté serveur (RPC annuler_course_client,
// migration 0030) : cette fonction ne pilote que l'affichage du bouton,
// jamais la seule protection.
const STATUTS_ANNULABLES_CLIENT = new Set<CourseStatus>(["en_attente_paiement", "en_attente", "acceptee", "retrait"]);

export function peutAnnulerCourse(course: Course): boolean {
  return STATUTS_ANNULABLES_CLIENT.has(course.statut);
}

export async function annulerCourseClient(
  client: SupabaseClient,
  input: { courseId: string; motif: string; commentaire?: string }
): Promise<Course> {
  const { data, error } = await client
    .rpc("annuler_course_client", {
      p_course_id: input.courseId,
      p_motif: input.motif,
      p_commentaire: input.commentaire ?? null,
    })
    .single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

export async function annulerCourseAdmin(
  client: SupabaseClient,
  input: { courseId: string; motif: string; commentaire?: string }
): Promise<Course> {
  const { data, error } = await client
    .rpc("annuler_course_admin", {
      p_course_id: input.courseId,
      p_motif: input.motif,
      p_commentaire: input.commentaire ?? null,
    })
    .single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

export async function resoudreLitige(
  client: SupabaseClient,
  input: { courseId: string; resolution: ResolutionLitige; motif?: string; commentaire?: string; montant?: number }
): Promise<Course> {
  const { data, error } = await client
    .rpc("resoudre_litige", {
      p_course_id: input.courseId,
      p_resolution: input.resolution,
      p_motif: input.motif ?? null,
      p_commentaire: input.commentaire ?? null,
      p_montant: input.montant ?? null,
    })
    .single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

export async function getHistoriqueAnnulations(
  client: SupabaseClient,
  params?: { courseId?: string; dateDebut?: string; dateFin?: string }
): Promise<HistoriqueAnnulation[]> {
  let requete = client.from("historique_annulations").select("*").order("created_at", { ascending: false });
  if (params?.courseId) requete = requete.eq("course_id", params.courseId);
  if (params?.dateDebut) requete = requete.gte("created_at", params.dateDebut);
  if (params?.dateFin) requete = requete.lte("created_at", params.dateFin);

  const { data, error } = await requete;
  if (error) throw error;
  return (data as HistoriqueAnnulationRow[]).map(historiqueAnnulationFromRow);
}
