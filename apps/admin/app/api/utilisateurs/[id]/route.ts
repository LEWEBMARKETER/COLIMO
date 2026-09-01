import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { utilisateurFromRow, type UtilisateurRow } from "@colimo/shared";

// Suppression d'un compte utilisateur — première route serveur de ce projet
// (jusqu'ici tout passait par des RPC Postgres "security definer", sans
// jamais avoir besoin d'un backend). Nécessaire ici parce que révoquer
// l'accès à Supabase Auth (bannissement, suppression réelle) requiert la
// clé service-role, qui ne doit jamais atteindre le navigateur.
//
// Un compte qui a de l'historique (courses, paiements, avis, litiges...) ne
// peut pas être réellement supprimé sans casser ces données — la quasi-
// totalité des colonnes qui référencent utilisateurs(id) sont en ON DELETE
// RESTRICT (par défaut), volontairement. On tente donc une suppression
// réelle ; si elle échoue (contrainte de clé étrangère), on bascule sur une
// anonymisation + bannissement définitif de la connexion, qui fonctionne
// pour tout compte sans jamais casser l'historique métier.

const BAN_DUREE_PERMANENTE = "876000h"; // ~100 ans — convention Supabase pour un bannissement définitif

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const cibleId = params.id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ erreur: "Configuration Supabase manquante." }, { status: 500 });
  }
  if (!serviceRoleKey) {
    return NextResponse.json(
      { erreur: "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée côté serveur (variable d'environnement Vercel)." },
      { status: 500 }
    );
  }

  // 1. Vérifie que l'appelant est un admin authentifié — même contrôle que
  // middleware.ts, mais une route API doit le revérifier elle-même (le
  // middleware protège la navigation de pages, pas les appels fetch()).
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {
        // Aucun cookie à réécrire depuis une route API.
      },
    },
  });

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  }

  const { data: profilAppelant } = await supabaseAuth.from("utilisateurs").select("type").eq("id", user.id).single();
  if (profilAppelant?.type !== "admin") {
    return NextResponse.json({ erreur: "Action réservée aux administrateurs." }, { status: 403 });
  }

  if (cibleId === user.id) {
    return NextResponse.json({ erreur: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }

  const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: cible, error: erreurCible } = await serviceClient
    .from("utilisateurs")
    .select("id, nom, telephone, type")
    .eq("id", cibleId)
    .single();
  if (erreurCible || !cible) {
    return NextResponse.json({ erreur: "Compte introuvable." }, { status: 404 });
  }
  if (cible.type === "admin") {
    return NextResponse.json({ erreur: "Impossible de supprimer un compte administrateur." }, { status: 400 });
  }

  const corps = await request.json().catch(() => ({}));
  const motif: string | null = typeof corps?.motif === "string" && corps.motif.trim() ? corps.motif.trim() : null;

  // 2. Tente une suppression réelle (cascade jusqu'à utilisateurs, puis
  // coursiers/commercants) — échoue proprement si le compte a le moindre
  // historique, auquel cas on bascule à l'étape 3.
  const { error: erreurSuppression } = await serviceClient.auth.admin.deleteUser(cibleId);

  if (!erreurSuppression) {
    await serviceClient.from("historique_suppressions_compte").insert({
      utilisateur_id: cible.id,
      nom_original: cible.nom,
      telephone_original: cible.telephone,
      type_compte: cible.type,
      mode: "suppression_definitive",
      administrateur_id: user.id,
      motif,
    });
    return NextResponse.json({ mode: "suppression_definitive" });
  }

  // 3. Repli : anonymisation des données personnelles + bannissement
  // définitif de la connexion (le compte ne peut plus jamais s'authentifier,
  // même s'il connaît toujours son mot de passe).
  const { data: utilisateurAnonymise } = await serviceClient
    .from("utilisateurs")
    .update({
      nom: "Utilisateur supprimé",
      prenom: null,
      telephone: `supprime-${cibleId}`,
      photo_url: null,
      zone: null,
      statut: "desactive",
    })
    .eq("id", cibleId)
    .select()
    .single();

  await serviceClient
    .from("commercants")
    .update({ adresse: null, responsable: null, whatsapp: null, photo_commerce_url: null })
    .eq("utilisateur_id", cibleId);

  await serviceClient
    .from("coursiers")
    .update({ documents: [], piece_identite_url: null })
    .eq("utilisateur_id", cibleId);

  await serviceClient.auth.admin.updateUserById(cibleId, { ban_duration: BAN_DUREE_PERMANENTE });

  await serviceClient.from("historique_suppressions_compte").insert({
    utilisateur_id: cible.id,
    nom_original: cible.nom,
    telephone_original: cible.telephone,
    type_compte: cible.type,
    mode: "anonymisation",
    administrateur_id: user.id,
    motif,
  });

  return NextResponse.json({
    mode: "anonymisation",
    utilisateur: utilisateurAnonymise ? utilisateurFromRow(utilisateurAnonymise as UtilisateurRow) : null,
  });
}
