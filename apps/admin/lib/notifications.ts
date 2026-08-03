import { EVENEMENT_MODELE_CODE, envoyerNotification, type EvenementNotification } from "@colimo/shared";
import { createClient } from "./supabaseClient";

// Équivalent admin de apps/mobile/lib/notifications.ts — même contrat : ne
// jamais bloquer l'action admin (résolution de litige, annulation) si la
// notification échoue. Résout elle-même l'admin courant (declenche_par),
// les pages admin ne suivant pas cette info aujourd'hui.
export async function notifierEvenement(
  evenement: EvenementNotification,
  params: { destinataire: string | null | undefined; variables: Record<string, string> }
): Promise<void> {
  if (!params.destinataire) return;
  try {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;
    await envoyerNotification(client, {
      declenchePar: user.id,
      type: "whatsapp",
      destinataire: params.destinataire,
      modeleCode: EVENEMENT_MODELE_CODE[evenement],
      variables: params.variables,
    });
  } catch {
    // Volontairement silencieux — cf. commentaire ci-dessus.
  }
}
