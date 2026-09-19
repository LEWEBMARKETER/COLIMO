import type { SupabaseClient } from "@supabase/supabase-js";
import { courseFromRow, type CourseRow } from "../supabase/mappers";
import type { Course } from "../types";
import type { DecisionEchecLivraison, EchecLivraison, MotifEchecLivraison } from "./types";

export * from "./types";

interface EchecLivraisonRow {
  id: string;
  course_id: string;
  numero_tentative: number;
  motif: MotifEchecLivraison;
  commentaire: string | null;
  coursier_id: string;
  decision: DecisionEchecLivraison | null;
  decide_par: string | null;
  decide_at: string | null;
  nouvelle_date_prevue: string | null;
  created_at: string;
}

function echecLivraisonFromRow(row: EchecLivraisonRow): EchecLivraison {
  return {
    id: row.id,
    courseId: row.course_id,
    numeroTentative: row.numero_tentative,
    motif: row.motif,
    commentaire: row.commentaire,
    coursierId: row.coursier_id,
    decision: row.decision,
    decideParId: row.decide_par,
    decideAt: row.decide_at,
    nouvelleDatePrevue: row.nouvelle_date_prevue,
    createdAt: row.created_at,
  };
}

// Coursier uniquement, quand il ne parvient pas à remettre le colis — motif
// obligatoire (migration 0049). Fait passer la course à "echouee" ; c'est
// ensuite au client (ou à l'admin) de choisir la suite via
// traiterEchecLivraison. Distinct du litige (qui reste réservé aux
// désaccords nécessitant un arbitrage COLIMO) et de l'annulation classique.
export async function declarerEchecLivraison(
  client: SupabaseClient,
  courseId: string,
  motif: MotifEchecLivraison,
  commentaire?: string
): Promise<Course> {
  const { data, error } = await client
    .rpc("declarer_echec_livraison", { p_course_id: courseId, p_motif: motif, p_commentaire: commentaire ?? null })
    .single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

// Client propriétaire de la course, ou admin — décide la suite d'une
// livraison échouée : nouvelle tentative (la course retourne dans le pool
// de recherche de coursier, coursier_id réinitialisé) ou retour au
// commerçant (statut "retournee", même statut terminal que pour un retour
// décidé après litige).
export async function traiterEchecLivraison(
  client: SupabaseClient,
  echecId: string,
  decision: DecisionEchecLivraison,
  nouvelleDatePrevue?: string
): Promise<Course> {
  const { data, error } = await client
    .rpc("traiter_echec_livraison", {
      p_echec_id: echecId,
      p_decision: decision,
      p_nouvelle_date: nouvelleDatePrevue ?? null,
    })
    .single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

// Visible par le client, le coursier concerné et l'admin (RLS, 0049).
export async function getEchecsLivraisonPourCourse(client: SupabaseClient, courseId: string): Promise<EchecLivraison[]> {
  const { data, error } = await client
    .from("historique_echecs_livraison")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as EchecLivraisonRow[]).map(echecLivraisonFromRow);
}
