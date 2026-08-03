import type { SupabaseClient } from "@supabase/supabase-js";
import {
  modeleNotificationFromRow,
  notificationFromRow,
  type ModeleNotificationRow,
  type NotificationRow,
} from "../supabase/mappers";
import { interpolerModele } from "./moteur";
import { getFournisseur } from "./providers";
import type { ModeleNotification, NotificationEnvoyee, StatutNotification, TypeNotification } from "./types";

// Point d'entrée unique du module Notifications. C'est la SEULE fonction que
// le reste de l'application doit appeler pour envoyer un SMS, un message
// WhatsApp, un email ou une notification push — jamais un fournisseur
// directement.
//
//   Application → envoyerNotification → Fournisseur (registre par type)
//
// Toute erreur d'envoi (fournisseur en échec) est capturée et enregistrée
// dans l'historique avec le statut "echec" ; elle n'est jamais propagée à
// l'appelant. Une erreur d'écriture en base (table notifications/modeles
// injoignable) est en revanche relancée, car elle signale un vrai problème
// d'infrastructure — c'est à l'appelant (cf. lib/notifications côté mobile)
// de décider s'il doit malgré tout laisser l'opération métier se poursuivre.
export async function envoyerNotification(
  client: SupabaseClient,
  input: {
    declenchePar: string;
    utilisateurId?: string | null;
    type: TypeNotification;
    destinataire: string;
    modeleCode: string;
    variables?: Record<string, string>;
  }
): Promise<NotificationEnvoyee> {
  const variables = input.variables ?? {};

  const { data: modeleData } = await client
    .from("modeles_notification")
    .select("*")
    .eq("code", input.modeleCode)
    .eq("type", input.type)
    .eq("actif", true)
    .maybeSingle();

  const modele = modeleData ? modeleNotificationFromRow(modeleData as ModeleNotificationRow) : null;
  const contenu = modele
    ? interpolerModele(modele.contenu, variables)
    : `[Modèle "${input.modeleCode}" introuvable ou inactif]`;
  const sujet = modele?.sujet ? interpolerModele(modele.sujet, variables) : undefined;

  const { data: inserted, error: insertError } = await client
    .from("notifications")
    .insert({
      utilisateur_id: input.utilisateurId ?? null,
      declenche_par: input.declenchePar,
      type: input.type,
      destinataire: input.destinataire,
      modele_code: input.modeleCode,
      contenu,
      statut: "en_attente",
    })
    .select()
    .single();
  if (insertError) throw insertError;

  let statut: StatutNotification;
  let erreur: string | null = null;
  try {
    const resultat = await getFournisseur(input.type).envoyer({ destinataire: input.destinataire, sujet, contenu });
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

  return notificationFromRow(updated as NotificationRow);
}

export async function getNotifications(
  client: SupabaseClient,
  params?: { type?: TypeNotification; statut?: StatutNotification }
): Promise<NotificationEnvoyee[]> {
  let requete = client.from("notifications").select("*").order("created_at", { ascending: false });
  if (params?.type) requete = requete.eq("type", params.type);
  if (params?.statut) requete = requete.eq("statut", params.statut);
  const { data, error } = await requete;
  if (error) throw error;
  return (data as NotificationRow[]).map(notificationFromRow);
}

export async function getModelesNotification(client: SupabaseClient): Promise<ModeleNotification[]> {
  const { data, error } = await client.from("modeles_notification").select("*").order("type").order("nom");
  if (error) throw error;
  return (data as ModeleNotificationRow[]).map(modeleNotificationFromRow);
}

export async function patchModeleNotification(
  client: SupabaseClient,
  id: string,
  body: { nom?: string; sujet?: string | null; contenu?: string; actif?: boolean }
): Promise<ModeleNotification> {
  const update: Record<string, unknown> = {};
  if (body.nom !== undefined) update.nom = body.nom;
  if (body.sujet !== undefined) update.sujet = body.sujet;
  if (body.contenu !== undefined) update.contenu = body.contenu;
  if (body.actif !== undefined) update.actif = body.actif;

  const { data, error } = await client.from("modeles_notification").update(update).eq("id", id).select().single();
  if (error) throw error;
  return modeleNotificationFromRow(data as ModeleNotificationRow);
}
