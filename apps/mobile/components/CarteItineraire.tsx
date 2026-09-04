import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { obtenirItineraire, type Coordonnees, type Itineraire } from "@colimo/shared";
import CarteOSM, { type PointCarte } from "@/components/CarteOSM";

interface CarteItineraireProps {
  depart: Coordonnees;
  arrivee: Coordonnees;
  labelDepart?: string;
  labelArrivee?: string;
  hauteur?: number;
  // Position live du coursier (course active uniquement) — mise à jour par
  // injection JS ciblée dans CarteOSM, sans recentrer/recharger la carte.
  positionCoursier?: Coordonnees | null;
  labelCoursier?: string;
}

export default function CarteItineraire({
  depart,
  arrivee,
  labelDepart = "Récupération",
  labelArrivee = "Livraison",
  hauteur = 220,
  positionCoursier = null,
  labelCoursier = "Coursier",
}: CarteItineraireProps) {
  const [itineraire, setItineraire] = useState<Itineraire | null>(null);

  useEffect(() => {
    let annule = false;
    obtenirItineraire(depart, arrivee).then((resultat) => {
      if (!annule) setItineraire(resultat);
    });
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depart.latitude, depart.longitude, arrivee.latitude, arrivee.longitude]);

  const points: PointCarte[] = [
    { id: "depart", coordonnees: depart, couleur: "#C41E24", label: labelDepart },
    { id: "arrivee", coordonnees: arrivee, couleur: "#2563EB", label: labelArrivee },
  ];

  const pointLive = positionCoursier
    ? { id: "coursier", coordonnees: positionCoursier, couleur: "#16A34A", label: labelCoursier }
    : null;

  return (
    <View className="mb-4">
      <CarteOSM points={points} trace={itineraire?.trace} hauteur={hauteur} pointLive={pointLive} />
      {itineraire && (
        <View className="mt-2 flex-row justify-between">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">
            Itinéraire suggéré : {itineraire.distanceKm.toFixed(1)} km
          </Text>
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">~{itineraire.dureeMinutes} min</Text>
        </View>
      )}
    </View>
  );
}
