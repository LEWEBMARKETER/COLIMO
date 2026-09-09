import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Envoie un email réel via l'API Resend, pour le compte du Communication
// Center — appelé par apps/admin/lib/emailProvider.ts, jamais directement.
// La clé RESEND_API_KEY ne quitte jamais cette route. Même compte Resend et
// même domaine vérifié que apps/mobile/api/email/envoyer.ts (deux apps
// Vercel distinctes, donc deux endpoints, mais un seul fournisseur).

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const expediteur = process.env.RESEND_EMAIL_EXPEDITEUR ?? "COLIMO <notifications@colimo.online>";

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ erreur: "Configuration Supabase manquante." }, { status: 500 });
  }
  if (!resendApiKey) {
    return NextResponse.json({ erreur: "Envoi d'email non configuré côté serveur." }, { status: 500 });
  }

  // Vérifie que l'appelant est un admin authentifié — même contrôle que
  // apps/admin/app/api/utilisateurs/[id]/route.ts : le middleware protège
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
  const destinataire: string | undefined = corps?.destinataire;
  const sujet: string | undefined = corps?.sujet;
  const contenu: string | undefined = corps?.contenu;
  if (!destinataire || !contenu) {
    return NextResponse.json({ erreur: "destinataire et contenu requis." }, { status: 400 });
  }

  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: expediteur, to: destinataire, subject: sujet || "COLIMO", text: contenu }),
    });

    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => "");
      return NextResponse.json({ erreur: `Resend a refusé l'envoi (${reponse.status}) : ${detail}` }, { status: 502 });
    }

    return NextResponse.json({ envoye: true });
  } catch (e) {
    return NextResponse.json(
      { erreur: e instanceof Error ? e.message : "Impossible de contacter Resend." },
      { status: 502 }
    );
  }
}
