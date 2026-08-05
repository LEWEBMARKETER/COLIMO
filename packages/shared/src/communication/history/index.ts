import type { SupabaseClient } from "@supabase/supabase-js";
import { communicationFromRow, type CommunicationRow } from "../../supabase/mappers";
import type { CanalCommunication, StatutCommunication } from "../types";
import type { CommunicationEnvoyee } from "./types";

export * from "./types";

/**
 * Historique de toutes les communications — email, SMS, WhatsApp, push.
 * Filtres disponibles pour l'admin (recherche, canal, statut, utilisateur,
 * plage de dates) — cf. apps/admin/app/(dashboard)/communication.
 */
export async function getCommunications(
  client: SupabaseClient,
  params?: {
    canal?: CanalCommunication;
    statut?: StatutCommunication;
    utilisateurId?: string;
    dateDebut?: string;
    dateFin?: string;
    recherche?: string;
  }
): Promise<CommunicationEnvoyee[]> {
  let requete = client.from("notifications").select("*").order("created_at", { ascending: false });
  if (params?.canal) requete = requete.eq("type", params.canal);
  if (params?.statut) requete = requete.eq("statut", params.statut);
  if (params?.utilisateurId) requete = requete.eq("utilisateur_id", params.utilisateurId);
  if (params?.dateDebut) requete = requete.gte("created_at", params.dateDebut);
  if (params?.dateFin) requete = requete.lte("created_at", params.dateFin);
  if (params?.recherche) requete = requete.or(`destinataire.ilike.%${params.recherche}%,contenu.ilike.%${params.recherche}%`);

  const { data, error } = await requete;
  if (error) throw error;
  return (data as CommunicationRow[]).map(communicationFromRow);
}

/**
 * Marque une communication comme lue — utilisée par l'inbox in-app
 * (mobile) quand l'utilisateur ouvre une notification.
 */
export async function marquerCommunicationLue(client: SupabaseClient, id: string): Promise<CommunicationEnvoyee> {
  const { data, error } = await client
    .from("notifications")
    .update({ statut: "lu", lu_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return communicationFromRow(data as CommunicationRow);
}

export async function marquerToutesCommunicationsLues(client: SupabaseClient, utilisateurId: string): Promise<void> {
  const { error } = await client
    .from("notifications")
    .update({ statut: "lu", lu_at: new Date().toISOString() })
    .eq("utilisateur_id", utilisateurId)
    .neq("statut", "lu");
  if (error) throw error;
}
