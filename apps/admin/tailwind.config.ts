import type { Config } from "tailwindcss";
import { colors, fonts } from "@colimo/shared";

// shadcn/ui a besoin de darkMode + de son bloc "container" par convention
// (non utilisé ici, l'admin n'a pas de mode sombre), et de couleurs
// exprimées via ses variables CSS (app/globals.css) plutôt qu'en dur —
// ce sont des AJOUTS : les tokens colimo-* directs ci-dessous restent la
// source de vérité pour tout le code existant, rien n'est retiré.
const config: Config = {
  darkMode: ["class"],
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
        "colimo-noir": colors.noir,
        "colimo-noir-clair": colors.noirClair,

        // shadcn/ui — mappées sur les mêmes tokens via app/globals.css,
        // jamais la palette zinc/slate par défaut.
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
        info: { DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        titre: [fonts.titre, "sans-serif"],
        texte: [fonts.texte, "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
