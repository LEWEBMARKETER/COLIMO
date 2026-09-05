import {
  EVENEMENT_CANAL,
  EVENEMENT_MODELE_CODE,
  envoyerCommunication,
  getCoursiersEligiblesCourse,
  selectionnerMeilleursCoursiers,
  type Course,
  type EvenementCommunication,
} from "@colimo/shared";
import { supabase } from "./supabaseClient";

// Point de passage unique pour déclencher une communication depuis l'app
// mobile suite à un événement métier (course créée, coursier attribué,
// litige ouvert...). N'appelle jamais un fournisseur directement — tout
// passe par packages/shared/src/communication (le Communication Center).
// Une communication qui échoue (fournisseur en échec, table injoignable)
// ne doit jamais bloquer l'opération métier qui l'a déclenchée : les
// erreurs sont donc avalées ici.
export async function notifierEvenement(
  evenement: EvenementCommunication,
  params: {
    declenchePar: string;
    destinataire: string | null | undefined;
    utilisateurId?: string;
    variables: Record<string, string>;
  }
): Promise<void> {
  if (!params.destinataire) return;
  try {
    await envoyerCommunication(supabase, {
      declenchePar: params.declenchePar,
      utilisateurId: params.utilisateurId,
      canal: EVENEMENT_CANAL[evenement],
      destinataire: params.destinataire,
      modeleCode: EVENEMENT_MODELE_CODE[evenement],
      variables: params.variables,
    });
  } catch {
    // Volontairement silencieux — cf. commentaire ci-dessus.
  }
}

// Mise en avant du meilleur match (attribution intelligente) : n'appeler
// que juste après la création d'une course encore non assignée. Le pool de
// courses disponibles et l'ordre d'acceptation ne changent pas — seuls les
// coursiers les mieux placés (zone couverte, note, peu d'annulations)
// reçoivent en plus une notification prioritaire. Échec silencieux comme
// notifierEvenement : ne doit jamais bloquer la publication de la course.
export async function notifierMeilleursCoursiers(course: Course, declenchePar: string): Promise<void> {
  try {
    const eligibles = await getCoursiersEligiblesCourse(supabase, course.id);
    const meilleurs = selectionnerMeilleursCoursiers(eligibles, 3);
    for (const coursier of meilleurs) {
      await notifierEvenement("coursier_nouvelle_course_disponible", {
        declenchePar,
        destinataire: coursier.telephone,
        variables: { prenom: coursier.prenom ?? coursier.nom, numero_commande: course.numeroCommande },
      });
      await notifierEvenement("notification_coursier_nouvelle_course_disponible", {
        declenchePar,
        destinataire: coursier.coursierId,
        utilisateurId: coursier.coursierId,
        variables: { numero_commande: course.numeroCommande },
      });
    }
  } catch {
    // Volontairement silencieux — une notification manquée ne doit jamais
    // remettre en cause la course déjà créée.
  }
}
