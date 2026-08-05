import { EVENEMENT_CANAL, EVENEMENT_MODELE_CODE, envoyerCommunication, type EvenementCommunication } from "@colimo/shared";
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
