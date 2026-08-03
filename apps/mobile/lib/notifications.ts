import { EVENEMENT_MODELE_CODE, envoyerNotification, type EvenementNotification } from "@colimo/shared";
import { supabase } from "./supabaseClient";

// Point de passage unique pour déclencher une notification depuis l'app
// mobile suite à un événement métier (course créée, coursier attribué,
// litige ouvert...). N'appelle jamais un fournisseur directement — tout
// passe par packages/shared/src/notifications. Une notification qui échoue
// (fournisseur en échec, table injoignable) ne doit jamais bloquer
// l'opération métier qui l'a déclenchée : les erreurs sont donc avalées ici.
export async function notifierEvenement(
  evenement: EvenementNotification,
  params: { declenchePar: string; destinataire: string | null | undefined; variables: Record<string, string> }
): Promise<void> {
  if (!params.destinataire) return;
  try {
    await envoyerNotification(supabase, {
      declenchePar: params.declenchePar,
      type: "whatsapp",
      destinataire: params.destinataire,
      modeleCode: EVENEMENT_MODELE_CODE[evenement],
      variables: params.variables,
    });
  } catch {
    // Volontairement silencieux — cf. commentaire ci-dessus.
  }
}
