import type { SupabaseClient } from "@supabase/supabase-js";
import { courseFromRow, type CourseRow } from "../supabase/mappers";
import type { Course, CourseStatus } from "../types";
import type { MethodeVerificationLivraison, ResultatVerificationLivraison, ValidationAdminLivraison } from "./types";

export * from "./types";

interface ValidationAdminLivraisonRow {
  id: string;
  course_id: string;
  ancien_statut: CourseStatus;
  nouveau_statut: CourseStatus;
  administrateur_id: string;
  methode_verification: MethodeVerificationLivraison;
  resultat: ResultatVerificationLivraison;
  note: string | null;
  source: "admin";
  created_at: string;
}

function validationAdminLivraisonFromRow(row: ValidationAdminLivraisonRow): ValidationAdminLivraison {
  return {
    id: row.id,
    courseId: row.course_id,
    ancienStatut: row.ancien_statut,
    nouveauStatut: row.nouveau_statut,
    administrateurId: row.administrateur_id,
    methodeVerification: row.methode_verification,
    resultat: row.resultat,
    note: row.note,
    source: row.source,
    createdAt: row.created_at,
  };
}

// Solution de secours réservée à l'admin — passe par la RPC
// valider_livraison_admin (security definer), seule autorisée à faire
// progresser une course "livree" sans confirmation client/coursier. Journalise
// systématiquement, y compris quand résultat = "impossible" (aucun
// changement de statut, seule la tentative est enregistrée).
export async function validerLivraisonAdmin(
  client: SupabaseClient,
  input: { courseId: string; methode: MethodeVerificationLivraison; resultat: ResultatVerificationLivraison; note?: string }
): Promise<Course> {
  const { data, error } = await client
    .rpc("valider_livraison_admin", {
      p_course_id: input.courseId,
      p_methode: input.methode,
      p_resultat: input.resultat,
      p_note: input.note ?? null,
    })
    .single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

// Historique des validations administratives d'une course — admin
// uniquement (RLS) : "reste principalement interne au back-office" (besoin
// section 7), contrairement à l'historique de confirmation normal.
export async function getValidationsAdminLivraison(client: SupabaseClient, courseId: string): Promise<ValidationAdminLivraison[]> {
  const { data, error } = await client
    .from("historique_validation_admin_livraison")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ValidationAdminLivraisonRow[]).map(validationAdminLivraisonFromRow);
}
