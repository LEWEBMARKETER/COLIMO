// Identité visuelle COLIMO — docs/COLIMO_CONTEXTE_PROJET.md §5
// Source unique consommée par apps/admin (Tailwind) et apps/mobile (NativeWind).

export const colors = {
  rougePrincipal: "#C41E24",
  rougeFonce: "#9E1419",
  rougeClair: "#FBE7E7",
  neutreFonce: "#2B2622",
  neutreClair: "#F1EDEA",
  fond: "#FAF8F5",
  // Sections sombres façon "vitrine" (page d'accueil, blocs de mise en avant)
  noir: "#18140F",
  noirClair: "#26201A",
} as const;

export const fonts = {
  titre: "Poppins",
  texte: "Inter",
} as const;
