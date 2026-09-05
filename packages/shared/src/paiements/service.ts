import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentOperator } from "../types";
import { patchCourse } from "../supabase/queries";
import {
  configurationPaiementAutomatiqueFromRow,
  paiementFromRow,
  type ConfigurationPaiementAutomatiqueRow,
  type PaiementRow,
} from "../supabase/mappers";
import type { ConfigurationPaiementAutomatique, Paiement, StatutPaiementManuel } from "./types";

// Module de paiement indépendant du module des commandes : ce fichier est
// le seul endroit qui sache que "payer" signifie aujourd'hui "attendre une
// validation manuelle admin". Les écrans n'appellent jamais directement la
// table `courses` pour gérer le paiement — ils passent par ici.

/**
 * Crée (ou récupère si elle existe déjà) la ligne de paiement d'une course,
 * et fait basculer la course en "en_attente_paiement" — elle n'est alors
 * plus visible des coursiers tant que le paiement n'est pas confirmé.
 */
export async function initierPaiementManuel(
  client: SupabaseClient,
  params: { courseId: string; utilisateurId: string; montantAttendu: number }
): Promise<Paiement> {
  const existant = await getPaiementParCourse(client, params.courseId);
  if (existant) return existant;

  const { data, error } = await client
    .from("paiements")
    .insert({
      course_id: params.courseId,
      utilisateur_id: params.utilisateurId,
      montant_attendu: params.montantAttendu,
    })
    .select()
    .single();
  if (error) throw error;

  await patchCourse(client, params.courseId, { statut: "en_attente_paiement" });

  return paiementFromRow(data as PaiementRow);
}

export async function getPaiementParCourse(client: SupabaseClient, courseId: string): Promise<Paiement | null> {
  const { data, error } = await client.from("paiements").select("*").eq("course_id", courseId).maybeSingle();
  if (error) throw error;
  return data ? paiementFromRow(data as PaiementRow) : null;
}

/**
 * Le client déclare avoir payé (formulaire "J'ai effectué le paiement") —
 * fonctionne aussi bien pour une première déclaration que pour une nouvelle
 * tentative après un rejet (les champs de validation précédents sont
 * réinitialisés).
 */
export async function declarerPaiement(
  client: SupabaseClient,
  paiementId: string,
  input: {
    reseau: PaymentOperator;
    numeroPayeur: string;
    montantPaye: number;
    referenceTransaction?: string;
    datePaiementDeclaree?: string;
    captureUrl?: string;
  }
): Promise<Paiement> {
  const { data, error } = await client
    .from("paiements")
    .update({
      reseau: input.reseau,
      numero_payeur: input.numeroPayeur,
      montant_paye: input.montantPaye,
      reference_transaction: input.referenceTransaction ?? null,
      date_paiement_declaree: input.datePaiementDeclaree ?? null,
      capture_url: input.captureUrl ?? null,
      statut: "en_attente_validation" satisfies StatutPaiementManuel,
      declare_at: new Date().toISOString(),
      valide_par: null,
      valide_at: null,
      motif_rejet: null,
    })
    .eq("id", paiementId)
    .select()
    .single();
  if (error) throw error;
  return paiementFromRow(data as PaiementRow);
}

/**
 * Validation admin : le paiement est confirmé et la course redevient
 * "en_attente" — donc à nouveau visible et acceptable par les coursiers
 * (il n'existe pas de moteur d'assignation automatique dans COLIMO ; les
 * coursiers acceptent eux-mêmes une course disponible dans leur zone).
 */
export async function validerPaiement(client: SupabaseClient, paiementId: string, adminId: string): Promise<Paiement> {
  const { data, error } = await client
    .from("paiements")
    .update({
      statut: "paiement_confirme" satisfies StatutPaiementManuel,
      valide_par: adminId,
      valide_at: new Date().toISOString(),
      motif_rejet: null,
    })
    .eq("id", paiementId)
    .select()
    .single();
  if (error) throw error;

  const paiement = paiementFromRow(data as PaiementRow);
  await patchCourse(client, paiement.courseId, { statut: "en_attente" });
  return paiement;
}

export async function rejeterPaiement(
  client: SupabaseClient,
  paiementId: string,
  adminId: string,
  motif?: string
): Promise<Paiement> {
  const { data, error } = await client
    .from("paiements")
    .update({
      statut: "paiement_rejete" satisfies StatutPaiementManuel,
      valide_par: adminId,
      valide_at: new Date().toISOString(),
      motif_rejet: motif ?? null,
    })
    .eq("id", paiementId)
    .select()
    .single();
  if (error) throw error;
  return paiementFromRow(data as PaiementRow);
}

export async function getPaiements(
  client: SupabaseClient,
  params?: { statut?: StatutPaiementManuel }
): Promise<Paiement[]> {
  let requete = client.from("paiements").select("*").order("created_at", { ascending: false });
  if (params?.statut) requete = requete.eq("statut", params.statut);
  const { data, error } = await requete;
  if (error) throw error;
  return (data as PaiementRow[]).map(paiementFromRow);
}

// --- Paiement automatique (scaffold, cf. docs/PAIEMENT_AUTOMATIQUE.md) ---
// `actif` reste à false tant qu'aucun identifiant fournisseur réel n'est
// configuré côté serveur — le flux manuel ci-dessus continue de s'appliquer
// sans aucun changement. Lu par tout utilisateur authentifié (l'app doit
// savoir si elle peut proposer le paiement automatique), modifié par
// l'admin uniquement (RLS, 0040).
export async function getConfigurationPaiementAutomatique(
  client: SupabaseClient
): Promise<ConfigurationPaiementAutomatique> {
  const { data, error } = await client
    .from("configuration_paiements_automatiques")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return configurationPaiementAutomatiqueFromRow(data as ConfigurationPaiementAutomatiqueRow);
}

export async function patchConfigurationPaiementAutomatique(
  client: SupabaseClient,
  adminId: string,
  body: { actif?: boolean; fournisseur?: PaymentOperator | null }
): Promise<ConfigurationPaiementAutomatique> {
  const { data, error } = await client
    .from("configuration_paiements_automatiques")
    .update({ ...body, mis_a_jour_par: adminId, mis_a_jour_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return configurationPaiementAutomatiqueFromRow(data as ConfigurationPaiementAutomatiqueRow);
}

export interface WebhookPaiement {
  id: string;
  fournisseur: string;
  payload: Record<string, unknown>;
  traite: boolean;
  erreur: string | null;
  createdAt: string;
}

// Journal brut des appels webhook reçus — réservé à l'admin (RLS), utile
// pour diagnostiquer une intégration fournisseur qui n'a encore jamais été
// exercée en conditions réelles dans cet environnement.
export async function getWebhooksPaiement(client: SupabaseClient, limite = 50): Promise<WebhookPaiement[]> {
  const { data, error } = await client
    .from("webhooks_paiement")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (
    data as { id: string; fournisseur: string; payload: Record<string, unknown>; traite: boolean; erreur: string | null; created_at: string }[]
  ).map((row) => ({
    id: row.id,
    fournisseur: row.fournisseur,
    payload: row.payload,
    traite: row.traite,
    erreur: row.erreur,
    createdAt: row.created_at,
  }));
}
