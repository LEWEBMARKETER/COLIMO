import { ScrollViewStyleReset } from "expo-router/html";

// Document HTML racine (Expo Router, convention app/+html.tsx) — seul
// point où poser des balises <meta> statiques, puisque "web.output: single"
// (app.json) sert une unique coquille HTML pour toutes les routes (rendu
// entièrement côté client, pas de SSR) : un vrai SEO par route demanderait
// de changer ce mode de build, hors périmètre de cette refonte. Ceci reste
// un gain réel (titre, description, Open Graph, langue, couleur de thème)
// par rapport à l'absence totale de ce fichier avant cette mission.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#C41E24" />
        <title>COLIMO — Livraison, transport et boutique au Gabon</title>
        <meta
          name="description"
          content="COLIMO connecte particuliers, commerces, coursiers et transporteurs partenaires à Libreville et dans le Grand Libreville : livraison de colis, transport de marchandises et boutique de produits, sur une seule plateforme."
        />
        <meta property="og:title" content="COLIMO — Livraison, transport et boutique au Gabon" />
        <meta
          property="og:description"
          content="Envoyez un colis, organisez un transport ou découvrez les produits de nos commerces partenaires, partout dans le Grand Libreville."
        />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_GA" />
        <meta name="robots" content="index, follow" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
