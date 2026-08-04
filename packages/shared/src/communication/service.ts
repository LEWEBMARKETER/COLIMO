import type { SupabaseClient } from "@supabase/supabase-js";
import { communicationFromRow, modeleCommunicationFromRow, type CommunicationRow, type ModeleCommunicationRow } from "../supabase/mappers";
import { interpolerModele } from "./templates/moteur";
import { getFournisseurEmail, getFournisseurPush, getFournisseurSMS, getFournisseurWhatsApp } from "./settings";
import type { CanalCommunication } from "./types";
import type { ModeleCommunication } from "./templates/types";
import type { CommunicationEnvoyee } from "./history/types";
import type { StatutCommunication } from "./types";

// Point d'entrée unique du Communication Center. C'est la SEULE fonction
// que le reste de l'application doit appeler pour envoyer un email, un SMS,
// un message WhatsApp ou une notification push — jamais un fournisseur
// directement, jamais la table `notifications` directement.
//
//   Module métier → communication.send() → Templates (interpolation)
//                                         → History (enregistrement)
//                                         → Providers (Settings → fournisseur actif du canal)
//
// Toute erreur d'envoi (fournisseur en échec) est capturée et enregistrée
// dans l'historique avec le statut "echec" ; elle n'est jamais propagée à
// l'appelant. Une erreur d'écriture en base (table injoignable) est en
// revanche relancée, car elle signale un vrai problème d'infrastructure —
// c'est à l'appelant (cf. lib/communication côté mobile/admin) de décider
// s'il doit malgré tout laisser l'opération métier se poursuivre.
export async function envoyerCommunication(
  client: SupabaseClient,
  input: {
    declenchePar: string;
    utilisateurId?: string | null;
    canal: CanalCommunication;
    destinataire: string;
    modeleCode: string;
    variables?: Record<string, string>;
  }
): Promise<CommunicationEnvoyee> {
  const variables = input.variables ?? {};

  const { data: modeleData } = await client
    .from("modeles_notification")
    .select("*")
    .eq("code", input.modeleCode)
    .eq("type", input.canal)
    .eq("actif", true)
    .maybeSingle();

  const modele = modeleData ? modeleCommunicationFromRow(modeleData as ModeleCommunicationRow) : null;
  const contenu = modele
    ? interpolerModele(modele.contenu, variables)
    : `[Modèle "${input.modeleCode}" introuvable ou inactif]`;
  const sujet = modele?.sujet ? interpolerModele(modele.sujet, variables) : undefined;

  const { data: inserted, error: insertError } = await client
    .from("notifications")
    .insert({
      utilisateur_id: input.utilisateurId ?? null,
      declenche_par: input.declenchePar,
      type: input.canal,
      destinataire: input.destinataire,
      modele_code: input.modeleCode,
      contenu,
      statut: "en_attente",
    })
    .select()
    .single();
  if (insertError) throw insertError;

  let statut: StatutCommunication;
  let erreur: string | null = null;
  try {
    const resultat = await envoyerViaFournisseur(input.canal, { destinataire: input.destinataire, sujet, contenu });
    statut = resultat.succes ? "envoye" : "echec";
    erreur = resultat.erreur ?? null;
  } catch (e) {
    statut = "echec";
    erreur = e instanceof Error ? e.message : "Erreur inconnue du fournisseur";
  }

  const { data: updated, error: updateError } = await client
    .from("notifications")
    .update({ statut, erreur, envoye_at: statut === "envoye" ? new Date().toISOString() : null })
    .eq("id", inserted.id)
    .select()
    .single();
  if (updateError) throw updateError;

  return communicationFromRow(updated as CommunicationRow);
}

async function envoyerViaFournisseur(
  canal: CanalCommunication,
  params: { destinataire: string; sujet?: string; contenu: string }
) {
  switch (canal) {
    case "email":
      return getFournisseurEmail().envoyer({ destinataire: params.destinataire, sujet: params.sujet ?? "", contenu: params.contenu });
    case "sms":
      return getFournisseurSMS().envoyer({ destinataire: params.destinataire, contenu: params.contenu });
    case "whatsapp":
      return getFournisseurWhatsApp().envoyer({ destinataire: params.destinataire, contenu: params.contenu });
    case "push":
      return getFournisseurPush().envoyer({ destinataire: params.destinataire, titre: params.sujet, contenu: params.contenu });
  }
}

export async function getModelesCommunication(client: SupabaseClient): Promise<ModeleCommunication[]> {
  const { data, error } = await client.from("modeles_notification").select("*").order("type").order("nom");
  if (error) throw error;
  return (data as ModeleCommunicationRow[]).map(modeleCommunicationFromRow);
}

export async function patchModeleCommunication(
  client: SupabaseClient,
  id: string,
  body: { nom?: string; sujet?: string | null; contenu?: string; actif?: boolean }
): Promise<ModeleCommunication> {
  const update: Record<string, unknown> = {};
  if (body.nom !== undefined) update.nom = body.nom;
  if (body.sujet !== undefined) update.sujet = body.sujet;
  if (body.contenu !== undefined) update.contenu = body.contenu;
  if (body.actif !== undefined) update.actif = body.actif;

  const { data, error } = await client.from("modeles_notification").update(update).eq("id", id).select().single();
  if (error) throw error;
  return modeleCommunicationFromRow(data as ModeleCommunicationRow);
}

/**
 * API interne du Communication Center — le seul point d'appel que les
 * modules métier (Courses, Paiements, Litiges, Coursiers...) doivent
 * connaître. Aucun d'eux ne doit jamais importer un fournisseur ou
 * manipuler la table `notifications` directement.
 *
 *   await communication.send(client, { canal: "whatsapp", ... });
 */
export const communication = {
  send: envoyerCommunication,
};
