// Données de démonstration pour la conception des écrans mobiles.
// TODO: remplacer par des requêtes Supabase (@supabase/supabase-js) une fois le projet connecté.

import type { Course } from "@colimo/shared";

export const coursierZone = "libreville" as const;

export const coursesDisponibles: Course[] = [
  {
    id: "d1",
    clientId: "u10",
    coursierId: null,
    adresseDepart: "Quartier Louis, Libreville",
    adresseArrivee: "Nombakélé, Libreville",
    zoneDepart: "libreville",
    zoneArrivee: "libreville",
    typeColis: "Documents",
    livraisonPrioritaire: false,
    prix: 2000,
    statut: "en_attente",
    createdAt: "2026-07-20T08:00:00Z",
  },
  {
    id: "d2",
    clientId: "u11",
    coursierId: null,
    adresseDepart: "Glass, Libreville",
    adresseArrivee: "Akébé, Libreville",
    zoneDepart: "libreville",
    zoneArrivee: "libreville",
    typeColis: "Colis moyen",
    livraisonPrioritaire: true,
    prix: 2500,
    statut: "en_attente",
    createdAt: "2026-07-20T08:20:00Z",
  },
];

export function trouverCourse(id: string): Course | undefined {
  return coursesDisponibles.find((c) => c.id === id);
}
