import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { PREFIXE_TELEPHONE_COMPTE_SUPPRIME, utilisateurFromRow, type UtilisateurRow } from "@colimo/shared";

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
//
// Dans les deux cas, le téléphone et l'email réels sont libérés (remplacés
// par un placeholder) pour permettre une réinscription future avec la même
// identité — pour un coursier, un trigger (0044) bloque cette réinscription
// pendant 24h après la suppression, journalisée dans
// historique_suppressions_compte (déjà alimentée dans les deux branches).

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

  // Récupéré avant toute suppression/anonymisation : sert à la fois pour
  // l'audit (historique_suppressions_compte.email_original) et pour libérer
  // l'email au niveau Auth en cas d'anonymisation (cf. plus bas) — une fois
  // le compte réellement supprimé, l'utilisateur Auth n'existe plus et cet
  // appel échouerait.
  const { data: authCible } = await serviceClient.auth.admin.getUserById(cibleId);
  const emailOriginal = authCible?.user?.email ?? null;

  // Un coursier avec une course active (acceptee/retrait/en_cours) ne peut
  // être ni suspendu ni désactivé (verrouillé au niveau base par le trigger
  // coursiers_bloquer_transition_course_active, 0043) ni supprimé — la
  // suppression réelle échouerait de toute façon (FK RESTRICT depuis
  // courses), mais le repli anonymisation+bannissement, lui, réussirait et
  // couperait l'accès du coursier en pleine livraison. Vérifié ici, avant
  // toute tentative, pour échouer immédiatement avec un message clair.
  if (cible.type === "coursier") {
    const { count: nombreCoursesActives } = await serviceClient
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("coursier_id", cibleId)
      .in("statut", ["acceptee", "retrait", "en_cours"]);
    if ((nombreCoursesActives ?? 0) > 0) {
      return NextResponse.json(
        {
          erreur:
            "Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de suspendre, désactiver ou supprimer ce compte.",
        },
        { status: 409 }
      );
    }
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
      email_original: emailOriginal,
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
      telephone: `${PREFIXE_TELEPHONE_COMPTE_SUPPRIME}${cibleId}`,
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

  // Pour un coursier, l'anonymisation doit aussi le sortir de la
  // disponibilité (sinon un compte banni de la connexion resterait "en_ligne"
  // et continuerait d'apparaître disponible pour l'attribution — le
  // bannissement Auth ne touche que la connexion, pas coursiers.statut).
  const misesAJourCoursier: Record<string, unknown> = { documents: [], piece_identite_url: null };
  if (cible.type === "coursier") misesAJourCoursier.statut = "desactive";

  const { data: coursierAnonymise } = await serviceClient
    .from("coursiers")
    .update(misesAJourCoursier)
    .eq("utilisateur_id", cibleId)
    .select("id, statut")
    .maybeSingle();

  // Libère l'email réel côté Auth (sinon il resterait verrouillé
  // indéfiniment par ce compte banni, empêchant toute réinscription future
  // même après le délai — pour un coursier, ce délai est de 24h, cf. 0044).
  await serviceClient.auth.admin.updateUserById(cibleId, {
    email: emailOriginal ? `supprime-${cibleId}@colimo-supprime.invalid` : undefined,
    ban_duration: BAN_DUREE_PERMANENTE,
  });

  if (cible.type === "coursier" && coursierAnonymise) {
    await serviceClient.from("historique_coursier").insert({
      coursier_id: coursierAnonymise.id,
      action: "desactivation",
      nouvelle_valeur: "desactive",
      motif: motif ?? "Compte supprimé (anonymisation — historique existant conservé)",
      administrateur_id: user.id,
    });
  }

  await serviceClient.from("historique_suppressions_compte").insert({
    utilisateur_id: cible.id,
    nom_original: cible.nom,
    telephone_original: cible.telephone,
    email_original: emailOriginal,
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
