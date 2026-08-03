export interface Coordonnees {
  latitude: number;
  longitude: number;
}

// Centres approximatifs des zones desservies, utilisés uniquement pour
// centrer la carte par défaut avant que l'utilisateur place son point
// précis (GPS, recherche d'adresse ou pin manuel) — jamais pour le tarif.
export const CENTRES_ZONES: Record<import("../types").Zone, Coordonnees> = {
  libreville: { latitude: 0.4162, longitude: 9.4673 },
  akanda: { latitude: 0.5167, longitude: 9.4667 },
  owendo: { latitude: 0.2833, longitude: 9.5 },
  pk12: { latitude: 0.35, longitude: 9.55 },
  bikele_essassa: { latitude: 0.3667, longitude: 9.6 },
  ntoum: { latitude: 0.3833, longitude: 9.7667 },
};

// Lien "Ouvrir dans Google Maps" — ne nécessite aucune clé API, contrairement
// à un rendu de carte embarquée (Static Maps, Mapbox...) qui reste à
// configurer plus tard si une prévisualisation visuelle est souhaitée.
export function lienGoogleMaps(params: { latitude?: number; longitude?: number; adresse: string }): string {
  if (params.latitude !== undefined && params.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(params.adresse)}`;
}

// Distance à vol d'oiseau (formule de Haversine) — reste la source de vérité
// pour le tarif (indépendante de tout service externe). OSRM (voir osrm.ts)
// ne sert qu'à l'affichage d'un itinéraire visuel, jamais au calcul du prix.
export function distanceKm(a: Coordonnees, b: Coordonnees): number {
  const RAYON_TERRE_KM = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return RAYON_TERRE_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Estimation grossière du temps de trajet en minutes, à partir d'une vitesse
// moyenne en ville (circulation, arrêts) — à ajuster avec des données réelles
// une fois disponibles.
const VITESSE_MOYENNE_KMH = 22;

export function tempsEstimeMinutes(distance: number): number {
  return Math.max(5, Math.round((distance / VITESSE_MOYENNE_KMH) * 60));
}

export * from "./nominatim";
export * from "./osrm";
