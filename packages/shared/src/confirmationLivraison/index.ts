import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConfigurationConfirmationLivraison,
  ConfirmationLivraison,
  EtatConfirmationCoursier,
  HistoriqueConfirmationLivraison,
  ResultatVerificationOtp,
} from "./types";

export * from "./types";

interface ConfirmationLivraisonRow {
  course_id: string;
  code_otp: string;
  otp_genere_at: string;
  otp_expire_at: string;
  otp_verifie_at: string | null;
  otp_tentatives: number;
  otp_renvois: number;
  otp_dernier_envoi_at: string;
  coursier_confirme_at: string | null;
  client_confirmation_statut: ConfirmationLivraison["clientConfirmationStatut"];
  client_confirme_at: string | null;
  preuve_photo_path: string | null;
  preuve_photo_url: string | null;
  preuve_photo_uploaded_at: string | null;
  finalise_at: string | null;
  created_at: string;
}

function confirmationLivraisonFromRow(row: ConfirmationLivraisonRow): ConfirmationLivraison {
  return {
    courseId: row.course_id,
    codeOtp: row.code_otp,
    otpGenereAt: row.otp_genere_at,
    otpExpireAt: row.otp_expire_at,
    otpVerifieAt: row.otp_verifie_at,
    otpTentatives: row.otp_tentatives,
    otpRenvois: row.otp_renvois,
    otpDernierEnvoiAt: row.otp_dernier_envoi_at,
    coursierConfirmeAt: row.coursier_confirme_at,
    clientConfirmationStatut: row.client_confirmation_statut,
    clientConfirmeAt: row.client_confirme_at,
    preuvePhotoPath: row.preuve_photo_path,
    preuvePhotoUrl: row.preuve_photo_url,
    preuvePhotoUploadedAt: row.preuve_photo_uploaded_at,
    finaliseAt: row.finalise_at,
    createdAt: row.created_at,
  };
}

// Accessible uniquement au client propriétaire de la course (RLS, 0042) —
// contient le code en clair, à afficher pour qu'il le communique lui-même
// au coursier au moment de la remise.
export async function getConfirmationLivraison(client: SupabaseClient, courseId: string): Promise<ConfirmationLivraison | null> {
  const { data, error } = await client.from("confirmations_livraison").select("*").eq("course_id", courseId).maybeSingle();
  if (error) throw error;
  return data ? confirmationLivraisonFromRow(data as ConfirmationLivraisonRow) : null;
}

// Renvoie un nouveau code (anti-abus : quota + cooldown appliqués côté
// serveur, cf. 0042) — uniquement avant vérification par le coursier.
export async function renvoyerOtpLivraison(client: SupabaseClient, courseId: string): Promise<string> {
  const { data, error } = await client.rpc("renvoyer_otp_livraison", { p_course_id: courseId });
  if (error) throw error;
  return data as string;
}

// Coursier uniquement — ne renvoie jamais le code lui-même.
export async function verifierOtpLivraison(
  client: SupabaseClient,
  courseId: string,
  code: string
): Promise<ResultatVerificationOtp> {
  const { data, error } = await client.rpc("verifier_otp_livraison", { p_course_id: courseId, p_code: code });
  if (error) throw error;
  return data as ResultatVerificationOtp;
}

export async function getEtatConfirmationCoursier(
  client: SupabaseClient,
  courseId: string
): Promise<EtatConfirmationCoursier | null> {
  const { data, error } = await client.rpc("get_etat_confirmation_coursier", { p_course_id: courseId });
  if (error) throw error;
  const ligne = (data as
    | { otp_verifie: boolean; otp_tentatives: number; otp_tentatives_max: number; coursier_confirme_at: string | null; client_confirmation_statut: EtatConfirmationCoursier["clientConfirmationStatut"]; preuve_photo_uploaded_at: string | null }[]
    | null)?.[0];
  if (!ligne) return null;
  return {
    otpVerifie: ligne.otp_verifie,
    otpTentatives: ligne.otp_tentatives,
    otpTentativesMax: ligne.otp_tentatives_max,
    coursierConfirmeAt: ligne.coursier_confirme_at,
    clientConfirmationStatut: ligne.client_confirmation_statut,
    preuvePhotoUploadedAt: ligne.preuve_photo_uploaded_at,
  };
}

// Coursier uniquement, après vérification OTP réussie (imposé côté serveur).
export async function enregistrerPreuveLivraison(
  client: SupabaseClient,
  courseId: string,
  chemin: string,
  url: string
): Promise<void> {
  const { error } = await client.rpc("enregistrer_preuve_livraison", { p_course_id: courseId, p_chemin: chemin, p_url: url });
  if (error) throw error;
}

// Remplace le patchCourse direct utilisé jusqu'ici pour passer en
// "confirmee" — désormais conditionné à une confirmation coursier déjà
// enregistrée (0042). signaler=true journalise un signalement sans changer
// le statut (le parcours "Signaler un problème" existant, via litige, reste
// inchangé par ailleurs).
export async function confirmerReceptionClient(client: SupabaseClient, courseId: string, signaler = false): Promise<void> {
  const { error } = await client.rpc("confirmer_reception_client", { p_course_id: courseId, p_signaler: signaler });
  if (error) throw error;
}

interface ConfigurationConfirmationLivraisonRow {
  otp_longueur: 4 | 6;
  otp_validite_minutes: number;
  otp_tentatives_max: number;
  otp_renvois_max: number;
  delai_auto_finalisation_minutes: number;
  mis_a_jour_par: string | null;
  mis_a_jour_at: string;
}

function configurationConfirmationLivraisonFromRow(
  row: ConfigurationConfirmationLivraisonRow
): ConfigurationConfirmationLivraison {
  return {
    otpLongueur: row.otp_longueur,
    otpValiditeMinutes: row.otp_validite_minutes,
    otpTentativesMax: row.otp_tentatives_max,
    otpRenvoisMax: row.otp_renvois_max,
    delaiAutoFinalisationMinutes: row.delai_auto_finalisation_minutes,
    misAJourParId: row.mis_a_jour_par,
    misAJourAt: row.mis_a_jour_at,
  };
}

export async function getConfigurationConfirmationLivraison(
  client: SupabaseClient
): Promise<ConfigurationConfirmationLivraison> {
  const { data, error } = await client.from("configuration_confirmation_livraison").select("*").eq("id", 1).single();
  if (error) throw error;
  return configurationConfirmationLivraisonFromRow(data as ConfigurationConfirmationLivraisonRow);
}

// Vue d'ensemble pour l'admin (RLS : admin uniquement, cf. 0042) — utilisée
// pour afficher la preuve de livraison (statut OTP, confirmation client,
// photo) dans la liste des courses, sans repasser par une requête par ligne.
export async function getConfirmationsLivraisonAdmin(client: SupabaseClient): Promise<ConfirmationLivraison[]> {
  const { data, error } = await client.from("confirmations_livraison").select("*");
  if (error) throw error;
  return (data as ConfirmationLivraisonRow[]).map(confirmationLivraisonFromRow);
}

// Réservé à l'admin (RLS) — permet notamment d'ajuster le délai de
// finalisation automatique sans redéploiement (besoin section 6).
export async function patchConfigurationConfirmationLivraison(
  client: SupabaseClient,
  adminId: string,
  body: Partial<{
    otpLongueur: 4 | 6;
    otpValiditeMinutes: number;
    otpTentativesMax: number;
    otpRenvoisMax: number;
    delaiAutoFinalisationMinutes: number;
  }>
): Promise<ConfigurationConfirmationLivraison> {
  const update: Record<string, unknown> = { mis_a_jour_par: adminId, mis_a_jour_at: new Date().toISOString() };
  if (body.otpLongueur !== undefined) update.otp_longueur = body.otpLongueur;
  if (body.otpValiditeMinutes !== undefined) update.otp_validite_minutes = body.otpValiditeMinutes;
  if (body.otpTentativesMax !== undefined) update.otp_tentatives_max = body.otpTentativesMax;
  if (body.otpRenvoisMax !== undefined) update.otp_renvois_max = body.otpRenvoisMax;
  if (body.delaiAutoFinalisationMinutes !== undefined) update.delai_auto_finalisation_minutes = body.delaiAutoFinalisationMinutes;

  const { data, error } = await client
    .from("configuration_confirmation_livraison")
    .update(update)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return configurationConfirmationLivraisonFromRow(data as ConfigurationConfirmationLivraisonRow);
}

interface HistoriqueConfirmationLivraisonRow {
  id: string;
  course_id: string;
  evenement: HistoriqueConfirmationLivraison["evenement"];
  utilisateur_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Visible par les deux parties de la course + admin (RLS, 0042) — journal
// de preuve en cas de litige (besoin section 12).
export async function getHistoriqueConfirmationLivraison(
  client: SupabaseClient,
  courseId: string
): Promise<HistoriqueConfirmationLivraison[]> {
  const { data, error } = await client
    .from("historique_confirmation_livraison")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as HistoriqueConfirmationLivraisonRow[]).map((row) => ({
    id: row.id,
    courseId: row.course_id,
    evenement: row.evenement,
    utilisateurId: row.utilisateur_id,
    details: row.details,
    createdAt: row.created_at,
  }));
}
