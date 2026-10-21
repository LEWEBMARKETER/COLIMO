import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionHistoriqueTransporteur,
  ConfigurationModuleTransport,
  HistoriqueTransporteur,
  PieceIdentiteType,
  Transporteur,
  TypeVehiculeTransport,
  VehiculeTransporteur,
  VerificationStatus,
  Zone,
} from "../types";

// Module COLIMO TRANSPORT (Phase 1 — fondations). Mêmes conventions que
// packages/shared/src/coursiers : Row locale + fromRow, pas d'ajout au
// fichier central supabase/mappers.ts (patron déjà suivi par commissions/
// rechercheCoursier, modules ajoutés après coursiers dans ce repo).

interface TransporteurRow {
  id: string;
  utilisateur_id: string;
  nom_entreprise: string | null;
  documents: string[];
  type_piece_identite: PieceIdentiteType | null;
  piece_identite_url: string | null;
  zones_couvertes: Zone[];
  statut_verification: VerificationStatus;
  note_moyenne: number;
  created_at: string;
  updated_at: string;
}

function transporteurFromRow(row: TransporteurRow): Transporteur {
  return {
    id: row.id,
    utilisateurId: row.utilisateur_id,
    nomEntreprise: row.nom_entreprise,
    documents: row.documents ?? [],
    typePieceIdentite: row.type_piece_identite,
    pieceIdentiteUrl: row.piece_identite_url,
    zonesCouvertes: row.zones_couvertes ?? [],
    statutVerification: row.statut_verification,
    noteMoyenne: row.note_moyenne,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTransporteurByUtilisateurId(
  client: SupabaseClient,
  utilisateurId: string
): Promise<Transporteur | null> {
  const { data, error } = await client
    .from("transporteurs")
    .select("*")
    .eq("utilisateur_id", utilisateurId)
    .maybeSingle();
  if (error) throw error;
  return data ? transporteurFromRow(data as TransporteurRow) : null;
}

// Vue back-office (admin, RLS) — filtre optionnel par statut de
// vérification pour l'écran de validation des dossiers.
export async function getTransporteurs(
  client: SupabaseClient,
  filtres: { statutVerification?: VerificationStatus } = {}
): Promise<Transporteur[]> {
  let requete = client.from("transporteurs").select("*").order("created_at", { ascending: false });
  if (filtres.statutVerification) requete = requete.eq("statut_verification", filtres.statutVerification);
  const { data, error } = await requete;
  if (error) throw error;
  return (data as TransporteurRow[]).map(transporteurFromRow);
}

export async function insertTransporteur(
  client: SupabaseClient,
  input: {
    utilisateurId: string;
    nomEntreprise?: string;
    documents?: string[];
    typePieceIdentite?: PieceIdentiteType;
    pieceIdentiteUrl?: string;
    zonesCouvertes?: Zone[];
  }
): Promise<Transporteur> {
  const { data, error } = await client
    .from("transporteurs")
    .insert({
      utilisateur_id: input.utilisateurId,
      nom_entreprise: input.nomEntreprise ?? null,
      documents: input.documents ?? [],
      type_piece_identite: input.typePieceIdentite ?? null,
      piece_identite_url: input.pieceIdentiteUrl ?? null,
      zones_couvertes: input.zonesCouvertes ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return transporteurFromRow(data as TransporteurRow);
}

export async function patchTransporteur(
  client: SupabaseClient,
  id: string,
  body: { statutVerification?: VerificationStatus; zonesCouvertes?: Zone[]; nomEntreprise?: string }
): Promise<Transporteur> {
  const update: Record<string, unknown> = {};
  if (body.statutVerification) update.statut_verification = body.statutVerification;
  if (body.zonesCouvertes) update.zones_couvertes = body.zonesCouvertes;
  if (body.nomEntreprise !== undefined) update.nom_entreprise = body.nomEntreprise;

  const { data, error } = await client.from("transporteurs").update(update).eq("id", id).select().single();
  if (error) throw error;
  return transporteurFromRow(data as TransporteurRow);
}

// --- Véhicules ---------------------------------------------------------

interface VehiculeTransporteurRow {
  id: string;
  transporteur_id: string;
  type_vehicule: TypeVehiculeTransport;
  plaque_immatriculation: string;
  capacite_poids_kg: number | null;
  capacite_volume_m3: number | null;
  documents: string[];
  statut_verification: VerificationStatus;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

function vehiculeTransporteurFromRow(row: VehiculeTransporteurRow): VehiculeTransporteur {
  return {
    id: row.id,
    transporteurId: row.transporteur_id,
    typeVehicule: row.type_vehicule,
    plaqueImmatriculation: row.plaque_immatriculation,
    capacitePoidsKg: row.capacite_poids_kg,
    capaciteVolumeM3: row.capacite_volume_m3,
    documents: row.documents ?? [],
    statutVerification: row.statut_verification,
    actif: row.actif,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getVehiculesTransporteur(
  client: SupabaseClient,
  transporteurId: string
): Promise<VehiculeTransporteur[]> {
  const { data, error } = await client
    .from("vehicules_transporteur")
    .select("*")
    .eq("transporteur_id", transporteurId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as VehiculeTransporteurRow[]).map(vehiculeTransporteurFromRow);
}

export async function insertVehiculeTransporteur(
  client: SupabaseClient,
  input: {
    transporteurId: string;
    typeVehicule: TypeVehiculeTransport;
    plaqueImmatriculation: string;
    capacitePoidsKg?: number;
    capaciteVolumeM3?: number;
    documents?: string[];
  }
): Promise<VehiculeTransporteur> {
  const { data, error } = await client
    .from("vehicules_transporteur")
    .insert({
      transporteur_id: input.transporteurId,
      type_vehicule: input.typeVehicule,
      plaque_immatriculation: input.plaqueImmatriculation,
      capacite_poids_kg: input.capacitePoidsKg ?? null,
      capacite_volume_m3: input.capaciteVolumeM3 ?? null,
      documents: input.documents ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return vehiculeTransporteurFromRow(data as VehiculeTransporteurRow);
}

export async function patchVehiculeTransporteur(
  client: SupabaseClient,
  id: string,
  body: { statutVerification?: VerificationStatus; actif?: boolean }
): Promise<VehiculeTransporteur> {
  const update: Record<string, unknown> = {};
  if (body.statutVerification) update.statut_verification = body.statutVerification;
  if (typeof body.actif === "boolean") update.actif = body.actif;

  const { data, error } = await client
    .from("vehicules_transporteur")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return vehiculeTransporteurFromRow(data as VehiculeTransporteurRow);
}

// --- Historique d'audit (admin uniquement, RLS) -------------------------

interface HistoriqueTransporteurRow {
  id: string;
  transporteur_id: string;
  action: ActionHistoriqueTransporteur;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  motif: string | null;
  commentaire: string | null;
  administrateur_id: string | null;
  created_at: string;
}

function historiqueTransporteurFromRow(row: HistoriqueTransporteurRow): HistoriqueTransporteur {
  return {
    id: row.id,
    transporteurId: row.transporteur_id,
    action: row.action,
    ancienneValeur: row.ancienne_valeur,
    nouvelleValeur: row.nouvelle_valeur,
    motif: row.motif,
    commentaire: row.commentaire,
    administrateurId: row.administrateur_id,
    createdAt: row.created_at,
  };
}

async function ajouterEntreeHistoriqueTransporteur(
  client: SupabaseClient,
  input: {
    transporteurId: string;
    action: ActionHistoriqueTransporteur;
    ancienneValeur?: string | null;
    nouvelleValeur?: string | null;
    motif?: string | null;
    administrateurId: string;
  }
): Promise<void> {
  const { error } = await client.from("historique_transporteur").insert({
    transporteur_id: input.transporteurId,
    action: input.action,
    ancienne_valeur: input.ancienneValeur ?? null,
    nouvelle_valeur: input.nouvelleValeur ?? null,
    motif: input.motif ?? null,
    administrateur_id: input.administrateurId,
  });
  if (error) throw error;
}

export async function getHistoriqueTransporteur(
  client: SupabaseClient,
  transporteurId: string
): Promise<HistoriqueTransporteur[]> {
  const { data, error } = await client
    .from("historique_transporteur")
    .select("*")
    .eq("transporteur_id", transporteurId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as HistoriqueTransporteurRow[]).map(historiqueTransporteurFromRow);
}

// Valide/rejette le dossier — même patron que validerDossierCoursier/
// rejeterDossierCoursier (packages/shared/src/coursiers/statuts), sans le
// recalcul de badges/niveau (gamification spécifique au module Coursiers,
// absente de COLIMO TRANSPORT à ce stade).
export async function validerDossierTransporteur(
  client: SupabaseClient,
  transporteurId: string,
  administrateurId: string
): Promise<Transporteur> {
  const transporteur = await patchTransporteur(client, transporteurId, { statutVerification: "valide" });
  await ajouterEntreeHistoriqueTransporteur(client, {
    transporteurId,
    action: "validation_dossier",
    nouvelleValeur: "valide",
    administrateurId,
  });
  return transporteur;
}

export async function rejeterDossierTransporteur(
  client: SupabaseClient,
  transporteurId: string,
  administrateurId: string,
  motif?: string
): Promise<Transporteur> {
  const transporteur = await patchTransporteur(client, transporteurId, { statutVerification: "rejete" });
  await ajouterEntreeHistoriqueTransporteur(client, {
    transporteurId,
    action: "rejet_dossier",
    nouvelleValeur: "rejete",
    motif: motif ?? null,
    administrateurId,
  });
  return transporteur;
}

export async function validerVehiculeTransporteur(
  client: SupabaseClient,
  vehiculeId: string
): Promise<VehiculeTransporteur> {
  return patchVehiculeTransporteur(client, vehiculeId, { statutVerification: "valide" });
}

export async function rejeterVehiculeTransporteur(
  client: SupabaseClient,
  vehiculeId: string
): Promise<VehiculeTransporteur> {
  return patchVehiculeTransporteur(client, vehiculeId, { statutVerification: "rejete" });
}

// --- Configuration (feature flag) ---------------------------------------

interface ConfigurationModuleTransportRow {
  actif: boolean;
  mis_a_jour_par: string | null;
  mis_a_jour_at: string;
}

export async function getConfigurationModuleTransport(
  client: SupabaseClient
): Promise<ConfigurationModuleTransport> {
  const { data, error } = await client
    .from("configuration_module_transport")
    .select("actif, mis_a_jour_par, mis_a_jour_at")
    .eq("id", 1)
    .single();
  if (error) throw error;
  const row = data as ConfigurationModuleTransportRow;
  return { actif: row.actif, misAJourPar: row.mis_a_jour_par, misAJourAt: row.mis_a_jour_at };
}

export async function definirModuleTransportActif(
  client: SupabaseClient,
  actif: boolean,
  administrateurId: string
): Promise<void> {
  const { error } = await client
    .from("configuration_module_transport")
    .update({ actif, mis_a_jour_par: administrateurId, mis_a_jour_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}
