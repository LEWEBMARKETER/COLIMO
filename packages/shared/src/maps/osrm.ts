import { distanceKm, tempsEstimeMinutes, type Coordonnees } from "./index";

declare const fetch: (input: string) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

// Instance publique de démonstration OSRM — gratuite, sans clé, mais sans
// garantie de disponibilité ni de charge (usage "meilleur effort" documenté
// par le projet OSRM). En cas d'échec, on retombe silencieusement sur la
// distance à vol d'oiseau : l'itinéraire OSRM n'est qu'un affichage visuel,
// jamais la source du tarif.
const OSRM_BASE_URL = "https://router.project-osrm.org";

export interface Itineraire {
  distanceKm: number;
  dureeMinutes: number;
  trace: Coordonnees[];
}

interface ReponseOsrm {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }>;
}

function itineraireDeRepli(depart: Coordonnees, arrivee: Coordonnees): Itineraire {
  const distance = distanceKm(depart, arrivee);
  return {
    distanceKm: distance,
    dureeMinutes: tempsEstimeMinutes(distance),
    trace: [depart, arrivee],
  };
}

/**
 * Itinéraire routier suggéré entre deux points, via OSRM. N'est utilisé que
 * pour l'affichage (tracé + durée indicative) côté client/coursier — le
 * tarif reste calculé sur la distance à vol d'oiseau (distanceKm).
 */
export async function obtenirItineraire(depart: Coordonnees, arrivee: Coordonnees): Promise<Itineraire> {
  try {
    const url = `${OSRM_BASE_URL}/route/v1/driving/${depart.longitude},${depart.latitude};${arrivee.longitude},${arrivee.latitude}?overview=full&geometries=geojson`;
    const reponse = await fetch(url);
    if (!reponse.ok) return itineraireDeRepli(depart, arrivee);
    const donnees = (await reponse.json()) as ReponseOsrm;
    const route = donnees.routes?.[0];
    if (!route) return itineraireDeRepli(depart, arrivee);
    return {
      distanceKm: route.distance / 1000,
      dureeMinutes: Math.round(route.duration / 60),
      trace: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    };
  } catch {
    return itineraireDeRepli(depart, arrivee);
  }
}
