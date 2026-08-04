import { EVENEMENT_CANAL, EVENEMENT_MODELE_CODE, envoyerCommunication, type EvenementCommunication } from "@colimo/shared";
import { createClient } from "./supabaseClient";

// Équivalent admin de apps/mobile/lib/communication.ts — même contrat : ne
// jamais bloquer l'action admin (résolution de litige, annulation, validation
// de paiement/coursier) si la communication échoue. Résout elle-même
// l'admin courant (declenche_par), les pages admin ne suivant pas cette
// info aujourd'hui.
export async function notifierEvenement(
  evenement: EvenementCommunication,
  params: { destinataire: string | null | undefined; variables: Record<string, string> }
): Promise<void> {
  if (!params.destinataire) return;
  try {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;
    await envoyerCommunication(client, {
      declenchePar: user.id,
      canal: EVENEMENT_CANAL[evenement],
      destinataire: params.destinataire,
      modeleCode: EVENEMENT_MODELE_CODE[evenement],
      variables: params.variables,
    });
  } catch {
    // Volontairement silencieux — cf. commentaire ci-dessus.
  }
}
