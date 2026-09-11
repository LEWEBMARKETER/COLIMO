// Suppression du compte par son propre titulaire (espace "Paramètres du
// compte" — apps/mobile/components/ParametresCompte.tsx), symétrique de la
// suppression déjà possible côté admin (apps/admin/app/api/utilisateurs/
// [id]/route.ts) mais réservée à SOI-MÊME (pas de paramètre d'id : toujours
// déduit du jeton vérifié) et sans nécessiter le rôle admin.
//
// Même logique de repli que côté admin : tentative de suppression réelle
// (cascade jusqu'à utilisateurs), sinon anonymisation + bannissement
// définitif de la connexion si le compte a le moindre historique (courses,
// paiements, avis...) — sans jamais casser cet historique métier.
import { createClient } from "@supabase/supabase-js";

const PREFIXE_TELEPHONE_COMPTE_SUPPRIME = "supprime-";
const BAN_DUREE_PERMANENTE = "876000h"; // ~100 ans — convention Supabase pour un bannissement définitif
const STATUTS_COURSE_ACTIFS = new Set(["en_attente", "acceptee", "retrait", "en_cours"]);

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ erreur: "Méthode non autorisée." });
    return;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey) {
    res.status(500).json({ erreur: "Configuration Supabase manquante." });
    return;
  }
  if (!serviceRoleKey) {
    res.status(500).json({ erreur: "Suppression de compte non configurée côté serveur." });
    return;
  }

  const enteteAuth = req.headers.authorization;
  const jeton = typeof enteteAuth === "string" ? enteteAuth.replace(/^Bearer\s+/i, "") : null;
  if (!jeton) {
    res.status(401).json({ erreur: "Authentification requise." });
    return;
  }

  const clientAuth = createClient(supabaseUrl, anonKey);
  const { data: utilisateurAuth, error: erreurAuth } = await clientAuth.auth.getUser(jeton);
  if (erreurAuth || !utilisateurAuth.user) {
    res.status(401).json({ erreur: "Session invalide ou expirée." });
    return;
  }
  const cibleId = utilisateurAuth.user.id;

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: cible, error: erreurCible } = await serviceClient
    .from("utilisateurs")
    .select("id, nom, telephone, type")
    .eq("id", cibleId)
    .single();
  if (erreurCible || !cible) {
    res.status(404).json({ erreur: "Compte introuvable." });
    return;
  }
  // Réservé aux comptes client/commerce (type='client') : le flux coursier
  // (livraison active à réattribuer avant suppression, nettoyage de la
  // fiche coursiers...) n'est pas couvert par cette route, et l'espace
  // Paramètres où elle est appelée n'existe que côté client.
  if (cible.type !== "client") {
    res.status(400).json({ erreur: "Suppression de compte non disponible pour ce type de compte." });
    return;
  }

  // Un client/commerce avec une course active ne peut pas supprimer son
  // compte : le coursier n'aurait plus personne à livrer ni à contacter.
  const { count: nombreCoursesActives } = await serviceClient
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("client_id", cibleId)
    .in("statut", [...STATUTS_COURSE_ACTIFS]);
  if ((nombreCoursesActives ?? 0) > 0) {
    res.status(409).json({
      erreur: "Vous avez une course active en cours — attendez sa finalisation avant de supprimer votre compte.",
    });
    return;
  }

  const emailOriginal = utilisateurAuth.user.email ?? null;

  const body = (req.body ?? {}) as { motif?: string };
  const motif = typeof body.motif === "string" && body.motif.trim() ? body.motif.trim() : null;

  const { error: erreurSuppression } = await serviceClient.auth.admin.deleteUser(cibleId);

  if (!erreurSuppression) {
    await serviceClient.from("historique_suppressions_compte").insert({
      utilisateur_id: cible.id,
      nom_original: cible.nom,
      telephone_original: cible.telephone,
      email_original: emailOriginal,
      type_compte: cible.type,
      mode: "suppression_definitive",
      administrateur_id: cibleId,
      motif,
    });
    res.status(200).json({ mode: "suppression_definitive" });
    return;
  }

  // Repli : anonymisation + bannissement définitif (le compte a de
  // l'historique métier — courses, paiements, avis... — conservé tel quel).
  await serviceClient
    .from("utilisateurs")
    .update({
      nom: "Utilisateur supprimé",
      prenom: null,
      telephone: `${PREFIXE_TELEPHONE_COMPTE_SUPPRIME}${cibleId}`,
      photo_url: null,
      zone: null,
      statut: "desactive",
    })
    .eq("id", cibleId);

  await serviceClient
    .from("commercants")
    .update({ adresse: null, responsable: null, whatsapp: null, photo_commerce_url: null })
    .eq("utilisateur_id", cibleId);

  await serviceClient.auth.admin.updateUserById(cibleId, {
    email: emailOriginal ? `supprime-${cibleId}@colimo-supprime.invalid` : undefined,
    ban_duration: BAN_DUREE_PERMANENTE,
  });

  await serviceClient.from("historique_suppressions_compte").insert({
    utilisateur_id: cible.id,
    nom_original: cible.nom,
    telephone_original: cible.telephone,
    email_original: emailOriginal,
    type_compte: cible.type,
    mode: "anonymisation",
    administrateur_id: cibleId,
    motif,
  });

  res.status(200).json({ mode: "anonymisation" });
}
