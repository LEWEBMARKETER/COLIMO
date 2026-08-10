import type { Session } from "@supabase/supabase-js";
import type { Course, Utilisateur } from "@colimo/shared";
import { patchCourse } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";

// Point de passage unique pour l'acceptation d'une course par un coursier —
// utilisé depuis la carte "Accepter cette course" du dashboard et depuis
// l'aperçu détaillé, pour ne pas dupliquer les notifications déclenchées.
export async function accepterCourse(
  course: Course,
  session: Session,
  utilisateur: Utilisateur | null
): Promise<Course> {
  const misAJour = await patchCourse(course.id, { statut: "acceptee", coursierId: session.user.id });

  await notifierEvenement("coursier_attribue", {
    declenchePar: session.user.id,
    destinataire: course.telephoneDestinataire,
    variables: {
      nom_client: course.nomDestinataire ?? "client",
      numero_commande: course.numeroCommande,
      nom_coursier: utilisateur?.prenom ?? utilisateur?.nom ?? "votre coursier",
      telephone: utilisateur?.telephone ?? "",
    },
  });
  await notifierEvenement("notification_coursier_attribue", {
    declenchePar: session.user.id,
    destinataire: course.clientId,
    utilisateurId: course.clientId,
    variables: {
      nom_coursier: utilisateur?.prenom ?? utilisateur?.nom ?? "votre coursier",
      numero_commande: course.numeroCommande,
    },
  });

  return misAJour;
}
