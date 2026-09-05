import {
  ajouterCommentaireInterne as ajouterCommentaireInterneQuery,
  attribuerBadge as attribuerBadgeQuery,
  changerStatutCoursier as changerStatutCoursierQuery,
  creerBadgeCatalogue as creerBadgeCatalogueQuery,
  creerCodePromo as creerCodePromoQuery,
  definirNiveauCoursier as definirNiveauCoursierQuery,
  demanderDocumentsComplementaires as demanderDocumentsComplementairesQuery,
  desactiverCoursier as desactiverCoursierQuery,
  getBadgesCoursier as getBadgesCoursierQuery,
  getCatalogueBadges as getCatalogueBadgesQuery,
  getCatalogueNiveaux as getCatalogueNiveauxQuery,
  getCodesPromo as getCodesPromoQuery,
  getCommercantsBruts as getCommercantsBrutsQuery,
  getCoursierAvecUtilisateur as getCoursierAvecUtilisateurQuery,
  getCoursiersAvecStatutEffectif as getCoursiersAvecStatutEffectifQuery,
  getHistoriqueCoursiers as getHistoriqueCoursiersQuery,
  getLitiges as getLitigesQuery,
  getModelesCommunication as getModelesCommunicationQuery,
  getCommunications as getCommunicationsQuery,
  getPaiements as getPaiementsQuery,
  getConfigurationPaiementAutomatique as getConfigurationPaiementAutomatiqueQuery,
  patchConfigurationPaiementAutomatique as patchConfigurationPaiementAutomatiqueQuery,
  getWebhooksPaiement as getWebhooksPaiementQuery,
  getUtilisateurs as getUtilisateursQuery,
  getCoursiers as getCoursiersQuery,
  patchCatalogueBadge as patchCatalogueBadgeQuery,
  patchCatalogueNiveau as patchCatalogueNiveauQuery,
  patchCodePromo as patchCodePromoQuery,
  patchCoursier as patchCoursierQuery,
  patchCourse as patchCourseQuery,
  patchModeleCommunication as patchModeleCommunicationQuery,
  reactiverCoursier as reactiverCoursierQuery,
  recalculerBadgesEtNiveau as recalculerBadgesEtNiveauQuery,
  rejeterDossierCoursier as rejeterDossierCoursierQuery,
  rejeterPaiement as rejeterPaiementQuery,
  retirerBadge as retirerBadgeQuery,
  suspendreCoursier as suspendreCoursierQuery,
  updateUtilisateur as updateUtilisateurQuery,
  upsertCommercant as upsertCommercantQuery,
  validerDossierCoursier as validerDossierCoursierQuery,
  validerPaiement as validerPaiementQuery,
  getCourses as getCoursesQuery,
  annulerCourseAdmin as annulerCourseAdminQuery,
  resoudreLitige as resoudreLitigeQuery,
  getHistoriqueAnnulations as getHistoriqueAnnulationsQuery,
  activerAbonnementCommerce as activerAbonnementCommerceQuery,
  desactiverAbonnementCommerce as desactiverAbonnementCommerceQuery,
  suspendreAbonnementCommerce as suspendreAbonnementCommerceQuery,
  reactiverAbonnementCommerce as reactiverAbonnementCommerceQuery,
  getDemandesAbonnement as getDemandesAbonnementQuery,
  refuserDemandeAbonnement as refuserDemandeAbonnementQuery,
  getHistoriqueAbonnements as getHistoriqueAbonnementsQuery,
  getConfigurationPaiementAbonnement as getConfigurationPaiementAbonnementQuery,
  patchConfigurationPaiementAbonnement as patchConfigurationPaiementAbonnementQuery,
  getHistoriqueSuppressionsComptes as getHistoriqueSuppressionsComptesQuery,
  getPositionsCoursiers as getPositionsCoursiersQuery,
  type PositionCoursier,
  type HistoriqueSuppressionCompte,
  type ResultatSuppressionCompte,
  type ActionHistoriqueAbonnement,
  type ActionHistoriqueCoursier,
  type BadgeCoursier,
  type BadgeCoursierAttribue,
  type CanalCommunication,
  type CodePromo,
  type Commercant,
  type CommunicationEnvoyee,
  type ConfigurationPaiementAbonnement,
  type Coursier,
  type CoursierAvecStatutEffectif,
  type Course,
  type CourseStatus,
  type DemandeAbonnement,
  type HistoriqueAbonnement,
  type HistoriqueAnnulation,
  type HistoriqueCoursier,
  type Litige,
  type ModeleCommunication,
  type NiveauCoursier,
  type PackPayant,
  type ConfigurationPaiementAutomatique,
  type Paiement,
  type PaymentOperator,
  type WebhookPaiement,
  type RegleBadge,
  type ResolutionLitige,
  type StatutCommunication,
  type StatutCoursier,
  type StatutDemandeAbonnement,
  type StatutPaiementManuel,
  type TypeReductionPromo,
  type VerificationStatus,
  type Utilisateur,
  type Zone,
} from "@colimo/shared";
import { createClient } from "./supabaseClient";

export type { CoursierAvecUtilisateur } from "@colimo/shared";

async function idAdminCourant(): Promise<{ client: ReturnType<typeof createClient>; adminId: string }> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { client, adminId: user.id };
}

export function getUtilisateurs(): Promise<Utilisateur[]> {
  return getUtilisateursQuery(createClient());
}

export function getCoursiers() {
  return getCoursiersQuery(createClient());
}

export function patchCoursier(
  id: string,
  body: { statutVerification?: VerificationStatus; statut?: StatutCoursier; disponibilite?: boolean }
): Promise<Coursier> {
  return patchCoursierQuery(createClient(), id, body);
}

export function updateUtilisateur(
  id: string,
  body: { nom?: string; telephone?: string; zone?: Zone; statut?: string }
): Promise<Utilisateur> {
  return updateUtilisateurQuery(createClient(), id, body);
}

export function patchCourse(
  id: string,
  body: { statut?: CourseStatus; coursierId?: string | null; fraisRetour?: number | null }
): Promise<Course> {
  return patchCourseQuery(createClient(), id, body);
}

export function getCourses(params?: { zone?: Zone; statut?: CourseStatus }): Promise<Course[]> {
  return getCoursesQuery(createClient(), params);
}

export function annulerCourseAdmin(body: { courseId: string; motif: string; commentaire?: string }): Promise<Course> {
  return annulerCourseAdminQuery(createClient(), body);
}

export function resoudreLitige(body: {
  courseId: string;
  resolution: ResolutionLitige;
  motif?: string;
  commentaire?: string;
  montant?: number;
}): Promise<Course> {
  return resoudreLitigeQuery(createClient(), body);
}

export function getHistoriqueAnnulations(params?: {
  courseId?: string;
  dateDebut?: string;
  dateFin?: string;
}): Promise<HistoriqueAnnulation[]> {
  return getHistoriqueAnnulationsQuery(createClient(), params);
}

export function getCommercantsBruts(): Promise<Commercant[]> {
  return getCommercantsBrutsQuery(createClient());
}

export function upsertCommercant(input: {
  utilisateurId: string;
  adresse?: string;
  responsable?: string;
  horaires?: string;
  commissionTaux?: number;
}): Promise<Commercant> {
  return upsertCommercantQuery(createClient(), input);
}

// --- Abonnements commerçants (COLIMO PRO) -------------------------------

export function activerAbonnementCommerce(input: {
  commerceId: string;
  pack: PackPayant;
  dateDebut?: string;
  dureeJours?: number;
  motif?: string;
}): Promise<Commercant> {
  return activerAbonnementCommerceQuery(createClient(), input);
}

export function desactiverAbonnementCommerce(commerceId: string, motif?: string): Promise<Commercant> {
  return desactiverAbonnementCommerceQuery(createClient(), commerceId, motif);
}

export function suspendreAbonnementCommerce(commerceId: string, motif?: string): Promise<Commercant> {
  return suspendreAbonnementCommerceQuery(createClient(), commerceId, motif);
}

export function reactiverAbonnementCommerce(commerceId: string, motif?: string): Promise<Commercant> {
  return reactiverAbonnementCommerceQuery(createClient(), commerceId, motif);
}

export function getDemandesAbonnement(params?: {
  commerceId?: string;
  statut?: StatutDemandeAbonnement;
}): Promise<DemandeAbonnement[]> {
  return getDemandesAbonnementQuery(createClient(), params);
}

export function refuserDemandeAbonnement(demandeId: string, motif?: string): Promise<DemandeAbonnement> {
  return refuserDemandeAbonnementQuery(createClient(), demandeId, motif);
}

export function getHistoriqueAbonnements(params?: {
  commerceId?: string;
  action?: ActionHistoriqueAbonnement;
  dateDebut?: string;
  dateFin?: string;
}): Promise<HistoriqueAbonnement[]> {
  return getHistoriqueAbonnementsQuery(createClient(), params);
}

export function getConfigurationPaiementAbonnement(): Promise<ConfigurationPaiementAbonnement> {
  return getConfigurationPaiementAbonnementQuery(createClient());
}

export function patchConfigurationPaiementAbonnement(body: {
  numeroPaiement?: string;
  nomBeneficiaire?: string;
  moyenPaiement?: string;
  instructions?: string;
  whatsapp?: string;
  emailContact?: string;
}): Promise<ConfigurationPaiementAbonnement> {
  return patchConfigurationPaiementAbonnementQuery(createClient(), body);
}

export function getCodesPromo(): Promise<CodePromo[]> {
  return getCodesPromoQuery(createClient());
}

export function creerCodePromo(input: {
  code: string;
  typeReduction: TypeReductionPromo;
  valeur: number;
  dateDebut?: string;
  dateFin?: string;
  usageMax?: number;
}): Promise<CodePromo> {
  return creerCodePromoQuery(createClient(), input);
}

export function patchCodePromo(id: string, body: { actif?: boolean }): Promise<CodePromo> {
  return patchCodePromoQuery(createClient(), id, body);
}

export function getLitiges(): Promise<Litige[]> {
  return getLitigesQuery(createClient());
}

export function getCommunications(params?: {
  canal?: CanalCommunication;
  statut?: StatutCommunication;
  utilisateurId?: string;
  dateDebut?: string;
  dateFin?: string;
  recherche?: string;
}): Promise<CommunicationEnvoyee[]> {
  return getCommunicationsQuery(createClient(), params);
}

export function getModelesCommunication(): Promise<ModeleCommunication[]> {
  return getModelesCommunicationQuery(createClient());
}

export function patchModeleCommunication(
  id: string,
  body: { nom?: string; sujet?: string | null; contenu?: string; actif?: boolean }
): Promise<ModeleCommunication> {
  return patchModeleCommunicationQuery(createClient(), id, body);
}

export function getPaiements(params?: { statut?: StatutPaiementManuel }): Promise<Paiement[]> {
  return getPaiementsQuery(createClient(), params);
}

export async function validerPaiement(paiementId: string): Promise<Paiement> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return validerPaiementQuery(client, paiementId, user.id);
}

export async function rejeterPaiement(paiementId: string, motif?: string): Promise<Paiement> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return rejeterPaiementQuery(client, paiementId, user.id, motif);
}

export function getConfigurationPaiementAutomatique(): Promise<ConfigurationPaiementAutomatique> {
  return getConfigurationPaiementAutomatiqueQuery(createClient());
}

export async function patchConfigurationPaiementAutomatique(body: {
  actif?: boolean;
  fournisseur?: PaymentOperator | null;
}): Promise<ConfigurationPaiementAutomatique> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return patchConfigurationPaiementAutomatiqueQuery(client, user.id, body);
}

export function getWebhooksPaiement(limite?: number): Promise<WebhookPaiement[]> {
  return getWebhooksPaiementQuery(createClient(), limite);
}

// --- Module Coursiers : statuts, badges, niveaux, historique ---

export function getCoursiersAvecStatutEffectif(): Promise<CoursierAvecStatutEffectif[]> {
  return getCoursiersAvecStatutEffectifQuery(createClient());
}

// --- Carte live (géolocalisation) -----------------------------------------

export function getPositionsCoursiers(): Promise<PositionCoursier[]> {
  return getPositionsCoursiersQuery(createClient());
}

// L'abonnement Realtime (souscrireToutesPositionsCoursiers) n'est volontairement
// pas exposé ici : il doit être ouvert et fermé sur la MÊME instance de
// client Supabase (createClient() en crée une nouvelle à chaque appel), donc
// géré directement dans le composant — cf. app/(dashboard)/carte/page.tsx.

export function getCoursierAvecUtilisateur(id: string) {
  return getCoursierAvecUtilisateurQuery(createClient(), id);
}

export async function changerStatutCoursier(
  coursierId: string,
  nouveauStatut: StatutCoursier,
  params?: { ancienStatut?: StatutCoursier; motif?: string; commentaire?: string }
): Promise<Coursier> {
  const { client, adminId } = await idAdminCourant();
  return changerStatutCoursierQuery(client, coursierId, nouveauStatut, { administrateurId: adminId, ...params });
}

export async function suspendreCoursier(
  coursierId: string,
  params: { motif: string; commentaire?: string }
): Promise<Coursier> {
  const { client, adminId } = await idAdminCourant();
  return suspendreCoursierQuery(client, coursierId, { administrateurId: adminId, ...params });
}

export async function reactiverCoursier(coursierId: string, params?: { commentaire?: string }): Promise<Coursier> {
  const { client, adminId } = await idAdminCourant();
  return reactiverCoursierQuery(client, coursierId, { administrateurId: adminId, ...params });
}

export async function desactiverCoursier(
  coursierId: string,
  params?: { motif?: string; commentaire?: string }
): Promise<Coursier> {
  const { client, adminId } = await idAdminCourant();
  return desactiverCoursierQuery(client, coursierId, { administrateurId: adminId, ...params });
}

export async function validerDossierCoursier(coursierId: string): Promise<Coursier> {
  const { client, adminId } = await idAdminCourant();
  return validerDossierCoursierQuery(client, coursierId, adminId);
}

export async function rejeterDossierCoursier(coursierId: string, motif?: string): Promise<Coursier> {
  const { client, adminId } = await idAdminCourant();
  return rejeterDossierCoursierQuery(client, coursierId, adminId, motif);
}

export async function demanderDocumentsComplementaires(coursierId: string, commentaire?: string): Promise<void> {
  const { client, adminId } = await idAdminCourant();
  return demanderDocumentsComplementairesQuery(client, coursierId, adminId, commentaire);
}

export function getCatalogueBadges(): Promise<BadgeCoursier[]> {
  return getCatalogueBadgesQuery(createClient());
}

export function creerBadgeCatalogue(input: {
  code: string;
  nom: string;
  icone: string;
  description?: string;
  couleur?: string;
  modeAttribution?: "automatique" | "manuel";
  regle?: RegleBadge;
  ordreAffichage?: number;
}): Promise<BadgeCoursier> {
  return creerBadgeCatalogueQuery(createClient(), input);
}

export function patchCatalogueBadge(
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
  return patchCatalogueBadgeQuery(createClient(), id, body);
}

export function getBadgesCoursier(coursierId?: string): Promise<BadgeCoursierAttribue[]> {
  return getBadgesCoursierQuery(createClient(), coursierId);
}

export async function attribuerBadge(coursierId: string, badgeId: string): Promise<BadgeCoursierAttribue> {
  const { client, adminId } = await idAdminCourant();
  return attribuerBadgeQuery(client, coursierId, badgeId, { attribuePar: adminId });
}

export async function retirerBadge(attributionId: string): Promise<BadgeCoursierAttribue> {
  const { client, adminId } = await idAdminCourant();
  return retirerBadgeQuery(client, attributionId, { retirePar: adminId });
}

export function getCatalogueNiveaux(): Promise<NiveauCoursier[]> {
  return getCatalogueNiveauxQuery(createClient());
}

export function patchCatalogueNiveau(
  id: string,
  body: { nom?: string; seuilLivraisonsMin?: number; couleur?: string; icone?: string }
): Promise<NiveauCoursier> {
  return patchCatalogueNiveauQuery(createClient(), id, body);
}

export async function definirNiveauCoursier(coursierId: string, niveauId: string): Promise<void> {
  const { client, adminId } = await idAdminCourant();
  return definirNiveauCoursierQuery(client, coursierId, niveauId, adminId);
}

export function getHistoriqueCoursiers(params?: {
  coursierId?: string;
  action?: ActionHistoriqueCoursier;
  dateDebut?: string;
  dateFin?: string;
}): Promise<HistoriqueCoursier[]> {
  return getHistoriqueCoursiersQuery(createClient(), params);
}

export async function ajouterCommentaireInterne(coursierId: string, commentaire: string): Promise<HistoriqueCoursier> {
  const { client, adminId } = await idAdminCourant();
  return ajouterCommentaireInterneQuery(client, coursierId, commentaire, adminId);
}

export function recalculerBadgesEtNiveau(utilisateurId: string): Promise<void> {
  return recalculerBadgesEtNiveauQuery(createClient(), utilisateurId);
}

// --- Suppression de compte utilisateur ----------------------------------
//
// Passe par une route serveur (app/api/utilisateurs/[id]/route.ts) et non
// par une requête Supabase directe : révoquer l'accès à Supabase Auth
// (suppression réelle ou bannissement) nécessite la clé service-role, qui
// ne doit jamais atteindre le navigateur.

export async function supprimerCompteUtilisateur(
  utilisateurId: string,
  motif?: string
): Promise<ResultatSuppressionCompte> {
  const reponse = await fetch(`/api/utilisateurs/${utilisateurId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motif: motif ?? null }),
  });
  const corps = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(corps?.erreur || "Impossible de supprimer ce compte.");
  }
  return corps as ResultatSuppressionCompte;
}

export function getHistoriqueSuppressionsComptes(): Promise<HistoriqueSuppressionCompte[]> {
  return getHistoriqueSuppressionsComptesQuery(createClient());
}
