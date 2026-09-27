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

  // Nuances dérivées (LOT 1 de la refonte visuelle) — déjà utilisées côté
  // admin via les variables CSS shadcn/ui (app/globals.css), reprises ici à
  // l'identique pour que mobile et admin restent sur les mêmes valeurs.
  surface: "#FFFFFF",
  bordure: "#E8E2DA",
  survol: "#F5F1EC",
  selectionFond: "#FBE7E7",
  selectionTexte: "#9E1419",
  desactiveFond: "#F1EDEA",
  desactiveTexte: "#2B262266",

  // Couleurs sémantiques (statuts) — nouvelles, jamais utilisées seules
  // (toujours icône + texte en plus, cf. colimo-design-system).
  succes: "#2F7D5C",
  succesFond: "#E6F3ED",
  avertissement: "#B8720D",
  avertissementFond: "#FBEEDC",
  info: "#3B6B8C",
  infoFond: "#E7F0F5",
} as const;

export const fonts = {
  titre: "Poppins",
  texte: "Inter",
} as const;
