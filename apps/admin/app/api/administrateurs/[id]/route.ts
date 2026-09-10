import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { utilisateurFromRow, type PoleAdmin, type UtilisateurRow } from "@colimo/shared";
import { resoudreUrlSite } from "@/lib/urlSite";

const POLES_VALIDES: PoleAdmin[] = ["super_admin", "operations", "support_commerces", "finance_analytics"];
type ActionAutorisee = "modifier_role" | "suspendre" | "reactiver" | "renvoyer_invitation" | "annuler_invitation";

// Gestion d'un administrateur existant (rôle, accès, invitation), réservée
// au Super Admin — toutes les autres routes (pages, sidebar) ne font que
// cacher ces actions pour les autres pôles ; celle-ci est le vrai
// garde-fou. La table utilisateurs elle-même est aussi protégée en base
// (trigger proteger_pole_et_invitation_admin, 0046) contre un appel direct
// qui contournerait cette route.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

  const cookieStore = cookies();
  const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  }

  const { data: profilAppelant } = await supabaseAuth
    .from("utilisateurs")
    .select("type, pole_admin")
    .eq("id", user.id)
    .single();
  if (profilAppelant?.type !== "admin" || profilAppelant?.pole_admin !== "super_admin") {
    return NextResponse.json({ erreur: "Action réservée au Super Admin." }, { status: 403 });
  }

  const cibleId = params.id;
  if (cibleId === user.id) {
    return NextResponse.json({ erreur: "Impossible d'appliquer cette action à votre propre compte." }, { status: 400 });
  }

  const corps = await request.json().catch(() => ({}));
  const action: ActionAutorisee | null = [
    "modifier_role",
    "suspendre",
    "reactiver",
    "renvoyer_invitation",
    "annuler_invitation",
  ].includes(corps?.action)
    ? corps.action
    : null;
  if (!action) {
    return NextResponse.json({ erreur: "Action invalide." }, { status: 400 });
  }

  const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: cible } = await serviceClient
    .from("utilisateurs")
    .select("*")
    .eq("id", cibleId)
    .eq("type", "admin")
    .single();
  if (!cible) {
    return NextResponse.json({ erreur: "Administrateur introuvable." }, { status: 404 });
  }

  async function journaliser(resultat: "succes" | "echec", details?: Record<string, unknown>) {
    await serviceClient.from("historique_actions_admin").insert({
      administrateur_id: user!.id,
      action:
        action === "modifier_role"
          ? "role_modifie"
          : action === "suspendre"
            ? "acces_suspendu"
            : action === "reactiver"
              ? "acces_reactive"
              : action === "renvoyer_invitation"
                ? "invitation_renvoyee"
                : "invitation_annulee",
      cible_id: cibleId,
      details: details ?? null,
      resultat,
    });
  }

  if (action === "modifier_role") {
    const pole: PoleAdmin | null = POLES_VALIDES.includes(corps?.pole) ? (corps.pole as PoleAdmin) : null;
    if (!pole) {
      return NextResponse.json({ erreur: "Pôle invalide." }, { status: 400 });
    }
    const { data: misAJour, error } = await serviceClient
      .from("utilisateurs")
      .update({ pole_admin: pole })
      .eq("id", cibleId)
      .select()
      .single();
    if (error || !misAJour) {
      await journaliser("echec", { pole });
      return NextResponse.json({ erreur: "Impossible de modifier le rôle." }, { status: 400 });
    }
    await journaliser("succes", { ancienPole: cible.pole_admin, nouveauPole: pole });
    return NextResponse.json({ utilisateur: utilisateurFromRow(misAJour as UtilisateurRow) });
  }

  if (action === "suspendre" || action === "reactiver") {
    if (cible.statut_invitation !== "confirme") {
      return NextResponse.json(
        { erreur: "Seul un administrateur confirmé peut être suspendu ou réactivé." },
        { status: 400 }
      );
    }
    const nouveauStatut = action === "suspendre" ? "suspendu" : "actif";
    const { data: misAJour, error } = await serviceClient
      .from("utilisateurs")
      .update({ statut: nouveauStatut })
      .eq("id", cibleId)
      .select()
      .single();
    if (error || !misAJour) {
      await journaliser("echec");
      return NextResponse.json({ erreur: "Impossible de modifier l'accès de ce compte." }, { status: 400 });
    }
    await journaliser("succes");
    return NextResponse.json({ utilisateur: utilisateurFromRow(misAJour as UtilisateurRow) });
  }

  if (action === "annuler_invitation") {
    if (cible.statut_invitation !== "en_cours") {
      return NextResponse.json({ erreur: "Cette invitation n'est plus en cours." }, { status: 400 });
    }
    const { data: misAJour, error } = await serviceClient
      .from("utilisateurs")
      .update({ statut_invitation: "refuse" })
      .eq("id", cibleId)
      .select()
      .single();
    if (error || !misAJour) {
      await journaliser("echec");
      return NextResponse.json({ erreur: "Impossible d'annuler cette invitation." }, { status: 400 });
    }
    await journaliser("succes");
    return NextResponse.json({ utilisateur: utilisateurFromRow(misAJour as UtilisateurRow) });
  }

  // renvoyer_invitation
  if (cible.statut_invitation !== "en_cours") {
    return NextResponse.json({ erreur: "Cette invitation n'est plus en cours." }, { status: 400 });
  }
  const { data: compteAuth, error: erreurAuth } = await serviceClient.auth.admin.getUserById(cibleId);
  if (erreurAuth || !compteAuth?.user?.email) {
    await journaliser("echec");
    return NextResponse.json({ erreur: "Impossible de retrouver l'email de cet administrateur." }, { status: 400 });
  }
  // Cf. urlSite.ts : refuse plutôt que de renvoyer un lien pointant vers
  // localhost (poste de dev du Super Admin), inutilisable par l'invité.
  const urlSite = resoudreUrlSite(request);
  if (!urlSite) {
    await journaliser("echec");
    return NextResponse.json(
      {
        erreur:
          "Impossible de déterminer l'URL du back-office pour le lien d'invitation (envoi depuis localhost ?). Renvoyez l'invitation depuis le site déployé, ou configurez NEXT_PUBLIC_SITE_URL sur Vercel.",
      },
      { status: 400 }
    );
  }
  const { error: erreurInvitation } = await serviceClient.auth.admin.inviteUserByEmail(compteAuth.user.email, {
    redirectTo: `${urlSite}/invitation`,
  });
  if (erreurInvitation) {
    await journaliser("echec");
    return NextResponse.json(
      { erreur: erreurInvitation.message ?? "Impossible de renvoyer l'invitation." },
      { status: 400 }
    );
  }
  await journaliser("succes");
  return NextResponse.json({ utilisateur: utilisateurFromRow(cible as UtilisateurRow) });
}
