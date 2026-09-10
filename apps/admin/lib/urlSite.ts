import type { NextRequest } from "next/server";

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

// Résout l'URL publique du back-office pour construire un lien d'invitation
// (redirectTo). Se fiait auparavant uniquement à l'en-tête Origin de la
// requête — si un Super Admin envoie une invitation depuis son poste en
// développement local (localhost:3000), ce même localhost se retrouvait
// intégré dans l'email envoyé à l'invité, inutilisable sur son téléphone.
// Priorité : variable d'environnement explicite (fiable en toute
// circonstance) > Origin de la requête (sauf localhost) > aucune valeur
// fiable (l'appelant doit alors refuser d'envoyer l'invitation plutôt que
// de générer un lien cassé).
export function resoudreUrlSite(request: NextRequest): string | null {
  const configuree = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuree) return configuree.replace(/\/$/, "");

  const origine = request.headers.get("origin");
  if (origine && !LOCALHOST_RE.test(origine)) return origine;

  return null;
}
