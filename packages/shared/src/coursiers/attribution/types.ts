// Coursier éligible pour une course fraîchement publiée (zone couverte,
// disponible, en ligne) — vue réduite renvoyée par get_coursiers_eligibles_course
// (0039, security definer), pas un accès direct à la table `coursiers`.
export interface CoursierEligible {
  coursierId: string;
  telephone: string | null;
  nom: string;
  prenom: string | null;
  noteMoyenne: number;
  nombreCoursesAssignees: number;
  nombreCoursesAnnulees: number;
}
