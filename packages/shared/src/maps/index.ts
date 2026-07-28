// Lien "Ouvrir dans Google Maps" — ne nécessite aucune clé API, contrairement
// à un rendu de carte embarquée (Static Maps, Mapbox...) qui reste à
// configurer plus tard si une prévisualisation visuelle est souhaitée.
export function lienGoogleMaps(params: { latitude?: number; longitude?: number; adresse: string }): string {
  if (params.latitude !== undefined && params.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(params.adresse)}`;
}
