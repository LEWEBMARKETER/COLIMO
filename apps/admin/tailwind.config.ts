import type { Config } from "tailwindcss";
import { colors, fonts } from "@colimo/shared";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "colimo-rouge": colors.rougePrincipal,
        "colimo-rouge-fonce": colors.rougeFonce,
        "colimo-rouge-clair": colors.rougeClair,
        "colimo-neutre-fonce": colors.neutreFonce,
        "colimo-neutre-clair": colors.neutreClair,
        "colimo-fond": colors.fond,
      },
      fontFamily: {
        titre: [fonts.titre, "sans-serif"],
        texte: [fonts.texte, "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
