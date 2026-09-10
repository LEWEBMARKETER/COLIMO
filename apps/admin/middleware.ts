import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { poleADroitSurPage, type PoleAdmin } from "@colimo/shared";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

const ROUTES_PUBLIQUES = ["/login"];

// /invitation : la session y est temporaire (créée par le jeton du lien
// d'invitation, avant que le mot de passe ne soit défini) — ni redirigée
// vers /login si absente, ni vers / si présente (contrairement à /login),
// sinon un admin fraîchement invité serait renvoyé au dashboard sans avoir
// pu définir son mot de passe.
const ROUTES_EXEMPTEES = ["/invitation"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  if (ROUTES_EXEMPTEES.includes(request.nextUrl.pathname)) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const estRoutePublique = ROUTES_PUBLIQUES.includes(request.nextUrl.pathname);

  if (!user && !estRoutePublique) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // La session prouve seulement qu'un compte COLIMO existe (client, coursier
  // ou admin) — sans ce contrôle, n'importe quel compte mobile authentifié
  // pouvait charger l'intégralité du back-office admin. Un admin suspendu
  // (invitations/administrateurs) est bloqué de la même façon qu'un compte
  // d'un autre type.
  if (user) {
    const { data: profil } = await supabase
      .from("utilisateurs")
      .select("type, statut, pole_admin, statut_invitation")
      .eq("id", user.id)
      .single();
    // Tant que l'invitation n'est pas confirmée (en_cours) ou a été refusée
    // (refuse), aucun accès au Back Office n'est accordé — même avec un
    // mot de passe valide (ex. reset manuel), conformément au workflow
    // d'invitation à 3 statuts.
    const accesRefuse =
      profil?.type !== "admin" ||
      profil?.statut === "suspendu" ||
      profil?.statut === "desactive" ||
      profil?.statut_invitation !== "confirme";
    if (accesRefuse) {
      await supabase.auth.signOut();
      if (!estRoutePublique) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = "?erreur=acces_refuse";
        return NextResponse.redirect(url);
      }
      return response;
    }

    if (estRoutePublique) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Restriction de navigation par pôle — API routes exclues (chaque
    // route serveur sensible vérifie elle-même le pôle de l'appelant,
    // cf. api/administrateurs/**), uniquement les pages du back-office.
    if (
      !request.nextUrl.pathname.startsWith("/api/") &&
      !poleADroitSurPage(profil?.pole_admin as PoleAdmin | null, request.nextUrl.pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|apple-touch-icon.png|logo-colimo).*)"],
};
