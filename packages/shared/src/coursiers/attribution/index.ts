import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoursierEligible } from "./types";

export * from "./types";

interface CoursierEligibleRow {
  coursier_id: string;
  telephone: string | null;
  nom: string;
  prenom: string | null;
  note_moyenne: number;
  nombre_courses_assignees: number;
  nombre_courses_annulees: number;
}

function coursierEligibleFromRow(row: CoursierEligibleRow): CoursierEligible {
  return {
    coursierId: row.coursier_id,
    telephone: row.telephone,
    nom: row.nom,
    prenom: row.prenom,
    noteMoyenne: row.note_moyenne,
    nombreCoursesAssignees: row.nombre_courses_assignees,
    nombreCoursesAnnulees: row.nombre_courses_annulees,
  };
}

// N'appeler que juste après la création d'une course encore non assignée
// (statut "en_attente") — la fonction RPC (security definer, 0039) ne
// renvoie de résultat que pour la course du client appelant, tant qu'elle
// n'a pas encore de coursier. Ne remplace pas le pool de courses
// disponibles ni son fonctionnement premier-arrivé-premier-servi : sert
// uniquement à cibler une notification prioritaire.
export async function getCoursiersEligiblesCourse(client: SupabaseClient, courseId: string): Promise<CoursierEligible[]> {
  const { data, error } = await client.rpc("get_coursiers_eligibles_course", { p_course_id: courseId });
  if (error) throw error;
  return (data as CoursierEligibleRow[]).map(coursierEligibleFromRow);
}

// Score de correspondance — pure fonction, aucune notion de distance GPS
// (repose sur les zones couvertes déjà déclarées, l'éligibilité par zone
// étant déjà garantie par get_coursiers_eligibles_course). Favorise la
// fiabilité (note, peu d'annulations) : un coursier plus fiable a plus de
// chances d'être notifié en priorité, ce qui l'incite aussi à bien se
// comporter (cf. logique de fidélisation évoquée pour COLIMO PRO/coursiers).
export function calculerScoreCorrespondance(coursier: CoursierEligible): number {
  const tauxAnnulation =
    coursier.nombreCoursesAssignees > 0 ? coursier.nombreCoursesAnnulees / coursier.nombreCoursesAssignees : 0;
  return coursier.noteMoyenne * 20 - tauxAnnulation * 100;
}

// Sélectionne les meilleurs coursiers éligibles à notifier en priorité pour
// une course fraîchement publiée — le pool complet reste par ailleurs
// visible à tous les coursiers éligibles (aucun changement au mécanisme
// d'acceptation lui-même).
export function selectionnerMeilleursCoursiers(coursiers: CoursierEligible[], limite = 3): CoursierEligible[] {
  return [...coursiers].sort((a, b) => calculerScoreCorrespondance(b) - calculerScoreCorrespondance(a)).slice(0, limite);
}
