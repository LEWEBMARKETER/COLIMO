import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseSuiviPublic } from "./types";

export * from "./types";

interface CourseSuiviPublicRow {
  id: string;
  numero_commande: string;
  statut: CourseSuiviPublic["statut"];
  type_colis: string;
  categorie_colis: CourseSuiviPublic["categorieColis"];
  adresse_depart: string;
  adresse_arrivee: string;
  repere_depart: string | null;
  repere_arrivee: string | null;
  latitude_depart: number | null;
  longitude_depart: number | null;
  latitude_arrivee: number | null;
  longitude_arrivee: number | null;
  nom_expediteur: string | null;
  telephone_expediteur: string | null;
  nom_destinataire: string | null;
  telephone_destinataire: string | null;
  instructions: string | null;
  programmee_pour: string | null;
  coursier_id: string | null;
  coursier_nom: string | null;
  coursier_prenom: string | null;
  coursier_telephone: string | null;
  coursier_note: number | null;
  acceptee_at: string | null;
  recuperee_at: string | null;
  livree_at: string | null;
  confirmee_at: string | null;
  created_at: string;
}

function courseSuiviPublicFromRow(row: CourseSuiviPublicRow): CourseSuiviPublic {
  return {
    id: row.id,
    numeroCommande: row.numero_commande,
    statut: row.statut,
    typeColis: row.type_colis,
    categorieColis: row.categorie_colis,
    adresseDepart: row.adresse_depart,
    adresseArrivee: row.adresse_arrivee,
    repereDepart: row.repere_depart,
    repereArrivee: row.repere_arrivee,
    latitudeDepart: row.latitude_depart,
    longitudeDepart: row.longitude_depart,
    latitudeArrivee: row.latitude_arrivee,
    longitudeArrivee: row.longitude_arrivee,
    nomExpediteur: row.nom_expediteur,
    telephoneExpediteur: row.telephone_expediteur,
    nomDestinataire: row.nom_destinataire,
    telephoneDestinataire: row.telephone_destinataire,
    instructions: row.instructions,
    programmeePour: row.programmee_pour,
    coursierId: row.coursier_id,
    coursierNom: row.coursier_nom,
    coursierPrenom: row.coursier_prenom,
    coursierTelephone: row.coursier_telephone,
    coursierNote: row.coursier_note,
    accepteeAt: row.acceptee_at,
    recupereeAt: row.recuperee_at,
    livreeAt: row.livree_at,
    confirmeeAt: row.confirmee_at,
    createdAt: row.created_at,
  };
}

// Accessible sans session (le destinataire n'a en général aucun compte
// COLIMO) — la fonction RPC get_course_suivi_public est security definer
// et ne renvoie que la ligne correspondant au jeton, jamais un accès plus
// large à la table courses.
export async function getCourseSuiviPublic(client: SupabaseClient, token: string): Promise<CourseSuiviPublic | null> {
  const { data, error } = await client.rpc("get_course_suivi_public", { p_token: token }).maybeSingle();
  if (error) throw error;
  return data ? courseSuiviPublicFromRow(data as CourseSuiviPublicRow) : null;
}
