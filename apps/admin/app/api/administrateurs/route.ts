import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { utilisateurFromRow, type UtilisateurRow } from "@colimo/shared";

// Invitation d'un nouvel administrateur par l'administrateur principal.
//
// La création d'un compte type='admin' est bloquée via l'inscription
// standard, même pour une session déjà admin (trigger
// proteger_insertion_utilisateurs, 0028, ne vérifie que auth.uid() is not
// null) — cette route est donc le seul chemin possible, via la clé
// service-role : crée le compte Supabase Auth (email d'invitation avec
// lien pour définir le mot de passe), puis la ligne utilisateurs
// correspondante (type='admin'), dans la même requête privilégiée.
export async function POST(request: NextRequest) {
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

  // Vérifie que l'appelant est un admin authentifié — le middleware protège
  // la navigation de pages, pas les appels fetch().
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

  const corps = await request.json().catch(() => ({}));
  const nom: string = typeof corps?.nom === "string" ? corps.nom.trim() : "";
  const email: string = typeof corps?.email === "string" ? corps.email.trim() : "";
  const telephone: string = typeof corps?.telephone === "string" ? corps.telephone.trim() : "";
  if (!nom || !email || !telephone) {
    return NextResponse.json({ erreur: "Nom, email et téléphone requis." }, { status: 400 });
  }

  const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const origine = request.headers.get("origin") ?? supabaseUrl;
  const { data: invitation, error: erreurInvitation } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origine}/invitation`,
  });
  if (erreurInvitation || !invitation?.user) {
    return NextResponse.json(
      { erreur: erreurInvitation?.message ?? "Impossible d'inviter cet administrateur." },
      { status: 400 }
    );
  }

  const { data: nouvelUtilisateur, error: erreurInsertion } = await serviceClient
    .from("utilisateurs")
    .insert({ id: invitation.user.id, nom, telephone, type: "admin" })
    .select()
    .single();

  if (erreurInsertion || !nouvelUtilisateur) {
    // Le compte Auth a été créé sans profil correspondant (téléphone déjà
    // utilisé, par ex.) — on annule pour ne pas laisser un compte orphelin
    // auquel personne ne pourrait jamais accéder proprement (bloqué
    // ailleurs par current_user_type(), qui exige une ligne utilisateurs).
    await serviceClient.auth.admin.deleteUser(invitation.user.id);
    return NextResponse.json(
      { erreur: erreurInsertion?.message || "Impossible de créer le profil administrateur (téléphone déjà utilisé ?)." },
      { status: 400 }
    );
  }

  await serviceClient.from("historique_invitations_admin").insert({
    utilisateur_id: invitation.user.id,
    nom,
    email,
    invite_par: user.id,
  });

  return NextResponse.json({ utilisateur: utilisateurFromRow(nouvelUtilisateur as UtilisateurRow) });
}
