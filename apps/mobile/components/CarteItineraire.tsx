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
}

export default function CarteItineraire({
  depart,
  arrivee,
  labelDepart = "Récupération",
  labelArrivee = "Livraison",
  hauteur = 220,
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

  return (
    <View className="mb-4">
      <CarteOSM points={points} trace={itineraire?.trace} hauteur={hauteur} />
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
