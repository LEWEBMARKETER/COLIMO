// `expo export -p web` (mode "single"/SPA) génère toujours le même index.html
// minimal (favicon.ico uniquement) — il n'y a, dans cette version d'Expo, pas
// de mécanisme (manifest web app / +html.tsx) pour y injecter le manifest
// PWA et les icônes d'installation en mode SPA. Sans ces balises, "Ajouter à
// l'écran d'accueil" n'a aucune icône propre à utiliser et le navigateur en
// génère une lui-même (floue, redimensionnée grossièrement) au lieu du logo
// COLIMO en haute résolution. On complète donc index.html juste après le
// build, une fois pour toutes, plutôt que de dépendre d'un plugin instable.
const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "dist", "index.html");
const html = fs.readFileSync(indexPath, "utf8");

const tags = [
  '<meta name="theme-color" content="#C41E24" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="COLIMO" />',
  '<link rel="manifest" href="/manifest.json" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />',
  '<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />',
].join("");

if (html.includes('rel="manifest"')) {
  console.log("inject-pwa-head: déjà présent, rien à faire.");
  process.exit(0);
}

const misAJour = html.replace("</head>", `${tags}</head>`);
fs.writeFileSync(indexPath, misAJour);
console.log("inject-pwa-head: manifest + icônes PWA injectés dans dist/index.html");
