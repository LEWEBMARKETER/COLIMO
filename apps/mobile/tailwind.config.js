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
      },
      fontFamily: {
        titre: ["Poppins"],
        texte: ["Inter"],
      },
    },
  },
  plugins: [],
};
