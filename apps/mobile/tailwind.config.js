/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Miroir de packages/shared/src/theme.ts (source de vérité) : le loader de
        // config Tailwind ici ne peut pas require() un fichier TypeScript directement.
        "colimo-rouge": "#C41E24",
        "colimo-rouge-fonce": "#9E1419",
        "colimo-rouge-clair": "#FBE7E7",
        "colimo-neutre-fonce": "#2B2622",
        "colimo-neutre-clair": "#F1EDEA",
        "colimo-fond": "#FAF8F5",
        "colimo-noir": "#18140F",
        "colimo-noir-clair": "#26201A",

        // Nuances dérivées + couleurs sémantiques (LOT 1) — mêmes valeurs
        // que packages/shared/src/theme/index.ts.
        "colimo-surface": "#FFFFFF",
        "colimo-bordure": "#E8E2DA",
        "colimo-survol": "#F5F1EC",
        "colimo-selection-fond": "#FBE7E7",
        "colimo-selection-texte": "#9E1419",
        "colimo-desactive-fond": "#F1EDEA",
        "colimo-succes": "#2F7D5C",
        "colimo-succes-fond": "#E6F3ED",
        "colimo-avertissement": "#B8720D",
        "colimo-avertissement-fond": "#FBEEDC",
        "colimo-info": "#3B6B8C",
        "colimo-info-fond": "#E7F0F5",
      },
      fontFamily: {
        titre: ["Poppins_600SemiBold"],
        "titre-bold": ["Poppins_700Bold"],
        texte: ["Inter_400Regular"],
        "texte-medium": ["Inter_500Medium"],
      },
    },
  },
  plugins: [],
};
