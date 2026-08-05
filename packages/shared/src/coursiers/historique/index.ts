import type { SupabaseClient } from "@supabase/supabase-js";
import { historiqueCoursierFromRow, type HistoriqueCoursierRow } from "../../supabase/mappers";
import type { ActionHistoriqueCoursier, HistoriqueCoursier } from "./types";

export * from "./types";

export async function getHistoriqueCoursiers(
  client: SupabaseClient,
  params?: { coursierId?: string; action?: ActionHistoriqueCoursier; dateDebut?: string; dateFin?: string }
): Promise<HistoriqueCoursier[]> {
  let requete = client.from("historique_coursier").select("*").order("created_at", { ascending: false });
  if (params?.coursierId) requete = requete.eq("coursier_id", params.coursierId);
  if (params?.action) requete = requete.eq("action", params.action);
  if (params?.dateDebut) requete = requete.gte("created_at", params.dateDebut);
  if (params?.dateFin) requete = requete.lte("created_at", params.dateFin);

  const { data, error } = await requete;
  if (error) throw error;
  return (data as HistoriqueCoursierRow[]).map(historiqueCoursierFromRow);
}

export async function ajouterEntreeHistorique(
  client: SupabaseClient,
  input: {
    coursierId: string;
    action: ActionHistoriqueCoursier;
    ancienneValeur?: string | null;
    nouvelleValeur?: string | null;
    motif?: string | null;
    commentaire?: string | null;
    administrateurId?: string | null;
  }
): Promise<HistoriqueCoursier> {
  const { data, error } = await client
    .from("historique_coursier")
    .insert({
      coursier_id: input.coursierId,
      action: input.action,
      ancienne_valeur: input.ancienneValeur ?? null,
      nouvelle_valeur: input.nouvelleValeur ?? null,
      motif: input.motif ?? null,
      commentaire: input.commentaire ?? null,
      administrateur_id: input.administrateurId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return historiqueCoursierFromRow(data as HistoriqueCoursierRow);
}

export async function ajouterCommentaireInterne(
  client: SupabaseClient,
  coursierId: string,
  commentaire: string,
  administrateurId: string
): Promise<HistoriqueCoursier> {
  return ajouterEntreeHistorique(client, {
    coursierId,
    action: "commentaire_interne",
    commentaire,
    administrateurId,
  });
}
