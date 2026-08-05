import type { SupabaseClient } from "@supabase/supabase-js";
import {
  badgeCoursierFromRow,
  catalogueBadgeFromRow,
  type BadgeCoursierRow,
  type CatalogueBadgeRow,
} from "../../supabase/mappers";
import { ajouterEntreeHistorique } from "../historique";
import type { BadgeCoursier, BadgeCoursierAttribue, ModeAttributionBadge, RegleBadge } from "./types";

export * from "./types";
export * from "./evaluation";

export async function getCatalogueBadges(client: SupabaseClient): Promise<BadgeCoursier[]> {
  const { data, error } = await client.from("catalogue_badges").select("*").order("ordre_affichage");
  if (error) throw error;
  return (data as CatalogueBadgeRow[]).map(catalogueBadgeFromRow);
}

export async function creerBadgeCatalogue(
  client: SupabaseClient,
  input: {
    code: string;
    nom: string;
    icone: string;
    description?: string;
    couleur?: string;
    modeAttribution?: ModeAttributionBadge;
    regle?: RegleBadge;
    ordreAffichage?: number;
  }
): Promise<BadgeCoursier> {
  const { data, error } = await client
    .from("catalogue_badges")
    .insert({
      code: input.code,
      nom: input.nom,
      icone: input.icone,
      description: input.description ?? "",
      couleur: input.couleur ?? "#C41E24",
      mode_attribution: input.modeAttribution ?? "manuel",
      regle: input.regle ?? {},
      ordre_affichage: input.ordreAffichage ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return catalogueBadgeFromRow(data as CatalogueBadgeRow);
}

export async function patchCatalogueBadge(
  client: SupabaseClient,
  id: string,
  body: {
    nom?: string;
    icone?: string;
    description?: string;
    couleur?: string;
    regle?: RegleBadge;
    actif?: boolean;
    ordreAffichage?: number;
  }
): Promise<BadgeCoursier> {
  const update: Record<string, unknown> = {};
  if (body.nom !== undefined) update.nom = body.nom;
  if (body.icone !== undefined) update.icone = body.icone;
  if (body.description !== undefined) update.description = body.description;
  if (body.couleur !== undefined) update.couleur = body.couleur;
  if (body.regle !== undefined) update.regle = body.regle;
  if (body.actif !== undefined) update.actif = body.actif;
  if (body.ordreAffichage !== undefined) update.ordre_affichage = body.ordreAffichage;

  const { data, error } = await client.from("catalogue_badges").update(update).eq("id", id).select().single();
  if (error) throw error;
  return catalogueBadgeFromRow(data as CatalogueBadgeRow);
}

// coursierId omis = badges actifs de tous les coursiers (utilisé par le
// Dashboard/Liste pour éviter une requête par coursier).
export async function getBadgesCoursier(client: SupabaseClient, coursierId?: string): Promise<BadgeCoursierAttribue[]> {
  let requete = client.from("badges_coursiers").select("*").is("retire_le", null).order("attribue_le", { ascending: false });
  if (coursierId) requete = requete.eq("coursier_id", coursierId);
  const { data, error } = await requete;
  if (error) throw error;
  return (data as BadgeCoursierRow[]).map(badgeCoursierFromRow);
}

/**
 * Idempotent : si le badge est déjà actif pour ce coursier, renvoie
 * l'attribution existante plutôt que d'échouer sur la contrainte unique
 * (badges_coursiers_actif_unique) — important car l'automatisation peut
 * appeler cette fonction à répétition pour un badge déjà acquis.
 */
export async function attribuerBadge(
  client: SupabaseClient,
  coursierId: string,
  badgeId: string,
  params?: { attribuePar?: string; expireLe?: string }
): Promise<BadgeCoursierAttribue> {
  const { data: existant, error: erreurRecherche } = await client
    .from("badges_coursiers")
    .select("*")
    .eq("coursier_id", coursierId)
    .eq("badge_id", badgeId)
    .is("retire_le", null)
    .maybeSingle();
  if (erreurRecherche) throw erreurRecherche;
  if (existant) return badgeCoursierFromRow(existant as BadgeCoursierRow);

  const { data, error } = await client
    .from("badges_coursiers")
    .insert({
      coursier_id: coursierId,
      badge_id: badgeId,
      attribue_par: params?.attribuePar ?? null,
      expire_le: params?.expireLe ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const attribution = badgeCoursierFromRow(data as BadgeCoursierRow);
  await ajouterEntreeHistorique(client, {
    coursierId,
    action: "attribution_badge",
    nouvelleValeur: badgeId,
    administrateurId: params?.attribuePar ?? null,
  });
  return attribution;
}

export async function retirerBadge(
  client: SupabaseClient,
  attributionId: string,
  params?: { retirePar?: string }
): Promise<BadgeCoursierAttribue> {
  const { data, error } = await client
    .from("badges_coursiers")
    .update({ retire_le: new Date().toISOString(), retire_par: params?.retirePar ?? null })
    .eq("id", attributionId)
    .select()
    .single();
  if (error) throw error;

  const attribution = badgeCoursierFromRow(data as BadgeCoursierRow);
  await ajouterEntreeHistorique(client, {
    coursierId: attribution.coursierId,
    action: "retrait_badge",
    ancienneValeur: attribution.badgeId,
    administrateurId: params?.retirePar ?? null,
  });
  return attribution;
}
