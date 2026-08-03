// Lien "Ouvrir dans Google Maps" — ne nécessite aucune clé API, contrairement
// à un rendu de carte embarquée (Static Maps, Mapbox...) qui reste à
// configurer plus tard si une prévisualisation visuelle est souhaitée.
export function lienGoogleMaps(params: { latitude?: number; longitude?: number; adresse: string }): string {
  if (params.latitude !== undefined && params.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(params.adresse)}`;
}

// Distance à vol d'oiseau (formule de Haversine) — approximation locale sans
// dépendre d'une API de calcul d'itinéraire (Google Directions, Mapbox...),
// qui reste à intégrer plus tard si une distance routière précise est
// nécessaire.
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
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
