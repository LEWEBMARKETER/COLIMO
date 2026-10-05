import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommissionCourse,
  EntreeGrillePalier,
  HistoriquePalierCoursier,
  PalierCommission,
  PerformanceMensuelleCoursier,
} from "./types";

export * from "./types";
export * from "./calcul";

interface PalierCommissionRow {
  id: string;
  code: string;
  nom: string;
  seuil_min: number;
  seuil_max: number | null;
  taux: number;
  ordre: number;
  date_effet: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

function palierCommissionFromRow(row: PalierCommissionRow): PalierCommission {
  return {
    id: row.id,
    code: row.code,
    nom: row.nom,
    seuilMin: row.seuil_min,
    seuilMax: row.seuil_max,
    taux: row.taux,
    ordre: row.ordre,
    dateEffet: row.date_effet,
    actif: row.actif,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dateISOJour(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Premier jour du mois UTC contenant `date`, sans passer par un Date
// reconstruit à partir de getFullYear()/getMonth() (heure LOCALE) puis
// réinterprété en UTC par dateISOJour — ce round-trip décale le résultat
// d'un jour en arrière pour tout fuseau UTC+ (dont le Gabon, UTC+1) :
// minuit local le 1er octobre vaut 23h UTC le 30 septembre. La colonne
// `performance_mensuelle_coursier.mois` est elle posée côté serveur par
// date_trunc('month', ...) dans la session Postgres (UTC) — ce calcul
// doit donc rester en UTC du début à la fin pour correspondre.
function debutMoisUTC(date: Date): string {
  const annee = date.getUTCFullYear();
  const moisIndex = date.getUTCMonth();
  return `${annee}-${String(moisIndex + 1).padStart(2, "0")}-01`;
}

// Grille actuellement applicable (la plus récente dont la date d'effet est
// déjà passée) — même règle que calculer_et_enregistrer_commission_course
// (0055) côté base : jamais la grille la plus récente tout court (une
// grille future ne s'applique jamais par anticipation, besoin section 9).
export async function getCataloguePaliersCommission(
  client: SupabaseClient,
  dateReference: Date = new Date()
): Promise<PalierCommission[]> {
  const { data, error } = await client
    .from("catalogue_paliers_commission")
    .select("*")
    .lte("date_effet", dateISOJour(dateReference))
    .eq("actif", true)
    .order("date_effet", { ascending: false })
    .order("ordre", { ascending: true });
  if (error) throw error;
  const rows = (data as PalierCommissionRow[]).map(palierCommissionFromRow);
  const dateEffetActuelle = rows[0]?.dateEffet;
  if (!dateEffetActuelle) return [];
  return rows.filter((p) => p.dateEffet === dateEffetActuelle);
}

// Charge une version précise de la grille (édition admin) — contrairement à
// getCataloguePaliersCommission, pas de filtrage par date de référence.
export async function getGrillePaliersCommission(client: SupabaseClient, dateEffet: string): Promise<PalierCommission[]> {
  const { data, error } = await client
    .from("catalogue_paliers_commission")
    .select("*")
    .eq("date_effet", dateEffet)
    .order("ordre", { ascending: true });
  if (error) throw error;
  return (data as PalierCommissionRow[]).map(palierCommissionFromRow);
}

// Remplace intégralement la grille d'une date d'effet — validation
// complète (chevauchement, trous, taux) faite côté serveur par
// enregistrer_grille_paliers_commission (0053), jamais dupliquée ici.
export async function enregistrerGrillePaliersCommission(
  client: SupabaseClient,
  dateEffet: string,
  paliers: EntreeGrillePalier[]
): Promise<void> {
  const { error } = await client.rpc("enregistrer_grille_paliers_commission", {
    p_date_effet: dateEffet,
    p_paliers: paliers.map((p) => ({
      code: p.code,
      nom: p.nom,
      seuilMin: p.seuilMin,
      seuilMax: p.seuilMax,
      taux: p.taux,
      ordre: p.ordre,
    })),
  });
  if (error) throw error;
}

interface PerformanceMensuelleCoursierRow {
  id: string;
  coursier_id: string;
  mois: string;
  courses_eligibles: number;
  palier_id: string | null;
  taux_commission_actuel: number | null;
  chiffre_affaires_brut: number;
  commission_colimo_total: number;
  revenus_net_coursier: number;
  created_at: string;
  updated_at: string;
}

function performanceMensuelleFromRow(row: PerformanceMensuelleCoursierRow): PerformanceMensuelleCoursier {
  return {
    id: row.id,
    coursierId: row.coursier_id,
    mois: row.mois,
    coursesEligibles: row.courses_eligibles,
    palierId: row.palier_id,
    tauxCommissionActuel: row.taux_commission_actuel,
    chiffreAffairesBrut: row.chiffre_affaires_brut,
    commissionColimoTotal: row.commission_colimo_total,
    revenusNetCoursier: row.revenus_net_coursier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Performance du mois en cours pour le coursier connecté — RLS restreint
// déjà la lecture à sa propre ligne (performance_mensuelle_coursier_select_own_or_admin,
// 0053), aucun filtre côté client requis au-delà du mois. Retourne null tant
// qu'aucune course éligible n'a encore été confirmée ce mois-ci (la ligne
// n'est créée qu'au premier calcul, cf. 0055) — un statut STANDARD à 0
// course est alors l'état d'affichage par défaut, pas une erreur.
export async function getMaPerformanceMensuelle(
  client: SupabaseClient,
  mois: Date = new Date()
): Promise<PerformanceMensuelleCoursier | null> {
  const debutMois = debutMoisUTC(mois);
  const { data, error } = await client
    .from("performance_mensuelle_coursier")
    .select("*")
    .eq("mois", debutMois)
    .maybeSingle();
  if (error) throw error;
  return data ? performanceMensuelleFromRow(data as PerformanceMensuelleCoursierRow) : null;
}

// Vue back-office (admin uniquement, RLS) — filtres optionnels, laisse le
// croisement avec le nom du coursier à la page qui l'utilise (même pattern
// que le reste de l'admin : jointures d'affichage faites au niveau page).
export async function getPerformancesMensuelles(
  client: SupabaseClient,
  filtres: { mois?: string; coursierId?: string; palierId?: string } = {}
): Promise<PerformanceMensuelleCoursier[]> {
  let requete = client.from("performance_mensuelle_coursier").select("*");
  if (filtres.mois) requete = requete.eq("mois", filtres.mois);
  if (filtres.coursierId) requete = requete.eq("coursier_id", filtres.coursierId);
  if (filtres.palierId) requete = requete.eq("palier_id", filtres.palierId);
  const { data, error } = await requete.order("mois", { ascending: false });
  if (error) throw error;
  return (data as PerformanceMensuelleCoursierRow[]).map(performanceMensuelleFromRow);
}

interface CommissionCourseRow {
  id: string;
  course_id: string;
  coursier_id: string;
  montant_brut: number;
  taux_commission: number;
  montant_commission: number;
  montant_net_coursier: number;
  palier_id: string | null;
  calcule_at: string;
  created_at: string;
}

function commissionCourseFromRow(row: CommissionCourseRow): CommissionCourse {
  return {
    id: row.id,
    courseId: row.course_id,
    coursierId: row.coursier_id,
    montantBrut: row.montant_brut,
    tauxCommission: row.taux_commission,
    montantCommission: row.montant_commission,
    montantNetCoursier: row.montant_net_coursier,
    palierId: row.palier_id,
    calculeAt: row.calcule_at,
    createdAt: row.created_at,
  };
}

// Snapshot financier définitif d'une course (besoin section 4 et 10) —
// jamais recalculé après écriture, quelle que soit une modification
// ultérieure de la grille des paliers.
export async function getCommissionCourse(client: SupabaseClient, courseId: string): Promise<CommissionCourse | null> {
  const { data, error } = await client.from("commissions_courses").select("*").eq("course_id", courseId).maybeSingle();
  if (error) throw error;
  return data ? commissionCourseFromRow(data as CommissionCourseRow) : null;
}

interface HistoriquePalierCoursierRow {
  id: string;
  coursier_id: string;
  mois: string;
  palier_id: string;
  atteint_le: string;
  created_at: string;
}

function historiquePalierFromRow(row: HistoriquePalierCoursierRow): HistoriquePalierCoursier {
  return {
    id: row.id,
    coursierId: row.coursier_id,
    mois: row.mois,
    palierId: row.palier_id,
    atteintLe: row.atteint_le,
    createdAt: row.created_at,
  };
}

export interface FranchissementPalier {
  palierCode: string;
  palierNom: string;
  taux: number;
}

// Consomme la boîte aux lettres franchissement -> notification
// (notifications_palier_en_attente, 0053/0055) pour UN coursier précis —
// appelée juste après confirmer_reception_client / valider_livraison_admin
// par les écrans qui déclenchent ces deux RPC (track/[id].tsx côté client,
// ValidationLivraisonModal côté admin), jamais depuis ce module (voir
// packages/shared/src/communication : Courses/Coursiers importent le
// Communication Center, jamais l'inverse — cette fonction ne fait
// qu'exposer la RPC, l'appel à notifierEvenement reste à l'écran appelant).
export async function recupererEtMarquerNotificationPalier(
  client: SupabaseClient,
  coursierUtilisateurId: string
): Promise<FranchissementPalier | null> {
  const { data, error } = await client
    .rpc("recuperer_et_marquer_notification_palier", { p_coursier_utilisateur_id: coursierUtilisateurId })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ligne = data as { palier_code: string; palier_nom: string; taux: number };
  return { palierCode: ligne.palier_code, palierNom: ligne.palier_nom, taux: ligne.taux };
}

// Historique des franchissements — coursier (ses propres lignes) ou admin
// (RLS, 0053). coursierId optionnel : omis pour un coursier consultant les
// siennes (RLS filtre déjà), requis pour l'admin consultant un coursier précis.
export async function getHistoriquePaliersCoursier(
  client: SupabaseClient,
  coursierId?: string
): Promise<HistoriquePalierCoursier[]> {
  let requete = client.from("historique_palier_coursier").select("*");
  if (coursierId) requete = requete.eq("coursier_id", coursierId);
  const { data, error } = await requete.order("atteint_le", { ascending: false });
  if (error) throw error;
  return (data as HistoriquePalierCoursierRow[]).map(historiquePalierFromRow);
}
