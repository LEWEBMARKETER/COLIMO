import type { Coordonnees } from "./index";

declare const fetch: (input: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;
declare function setTimeout(callback: () => void, ms: number): unknown;

// Nominatim (OpenStreetMap) impose : un User-Agent identifiant l'application
// et au maximum 1 requête/seconde. Depuis un navigateur, l'en-tête
// User-Agent ne peut pas être personnalisé (restriction du navigateur) — il
// n'est donc appliqué que côté app native. La limite d'1 req/s, elle, est
// respectée dans tous les cas via la file d'attente ci-dessous.
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "COLIMO-App/1.0 (livraison Libreville, Gabon)";
const DELAI_MIN_MS = 1100;

interface ResultatRechercheNominatim {
  lat: string;
  lon: string;
  display_name: string;
}

interface ResultatInverseNominatim {
  display_name?: string;
}

const cacheGeocodage = new Map<string, Coordonnees | null>();
const cacheGeocodageInverse = new Map<string, string | null>();

let dernierAppel = 0;
let fileAttente: Promise<void> = Promise.resolve();

function attendreCreneauDisponible(): Promise<void> {
  const executer = fileAttente.then(async () => {
    const attente = Math.max(0, dernierAppel + DELAI_MIN_MS - Date.now());
    if (attente > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, attente));
    }
    dernierAppel = Date.now();
  });
  fileAttente = executer.catch(() => undefined);
  return executer;
}

async function appelerNominatim(chemin: string): Promise<unknown> {
  await attendreCreneauDisponible();
  const reponse = await fetch(`${NOMINATIM_BASE_URL}${chemin}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!reponse.ok) throw new Error(`Nominatim a répondu ${reponse.status}`);
  return reponse.json();
}

function normaliser(texte: string): string {
  return texte.trim().toLowerCase();
}

/**
 * Convertit une adresse ou un nom de quartier en coordonnées GPS. Renvoie
 * `null` si aucun résultat n'est trouvé (fréquent dans les zones
 * périurbaines peu cartographiées sur OSM) — l'appelant doit alors proposer
 * le placement manuel du point sur la carte plutôt que bloquer le flux.
 */
export async function geocoderAdresse(adresse: string, zone?: string): Promise<Coordonnees | null> {
  const cle = `${normaliser(adresse)}|${zone ? normaliser(zone) : ""}`;
  if (cacheGeocodage.has(cle)) return cacheGeocodage.get(cle) ?? null;

  const requete = zone ? `${adresse}, ${zone}, Gabon` : `${adresse}, Gabon`;
  try {
    const resultats = (await appelerNominatim(
      `/search?format=json&limit=1&countrycodes=ga&q=${encodeURIComponent(requete)}`
    )) as ResultatRechercheNominatim[];
    const premier = resultats[0];
    const coordonnees = premier
      ? { latitude: parseFloat(premier.lat), longitude: parseFloat(premier.lon) }
      : null;
    cacheGeocodage.set(cle, coordonnees);
    return coordonnees;
  } catch {
    return null;
  }
}

/**
 * Convertit des coordonnées GPS en adresse lisible (géocodage inverse).
 */
export async function geocoderInverse(coordonnees: Coordonnees): Promise<string | null> {
  const cle = `${coordonnees.latitude.toFixed(5)},${coordonnees.longitude.toFixed(5)}`;
  if (cacheGeocodageInverse.has(cle)) return cacheGeocodageInverse.get(cle) ?? null;

  try {
    const resultat = (await appelerNominatim(
      `/reverse?format=json&lat=${coordonnees.latitude}&lon=${coordonnees.longitude}`
    )) as ResultatInverseNominatim;
    const adresse = resultat.display_name ?? null;
    cacheGeocodageInverse.set(cle, adresse);
    return adresse;
  } catch {
    return null;
  }
}
