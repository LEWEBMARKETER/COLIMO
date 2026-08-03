import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CENTRES_ZONES, geocoderAdresse, type Coordonnees, type Zone } from "@colimo/shared";
import CarteOSM, { type PointCarte } from "@/components/CarteOSM";

interface SelecteurPointCarteProps {
  id: string;
  coordonnees: Coordonnees | null;
  onChangerCoordonnees: (coordonnees: Coordonnees) => void;
  adresseRecherche: string;
  zone?: Zone | null;
  couleur: string;
  pointContexte?: { coordonnees: Coordonnees; couleur: string; label?: string } | null;
}

export default function SelecteurPointCarte({
  id,
  coordonnees,
  onChangerCoordonnees,
  adresseRecherche,
  zone,
  couleur,
  pointContexte,
}: SelecteurPointCarteProps) {
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [localisationEnCours, setLocalisationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const centreParDefaut = zone ? CENTRES_ZONES[zone] : CENTRES_ZONES.libreville;
  const pointActif: PointCarte = {
    id,
    couleur,
    coordonnees: coordonnees ?? centreParDefaut,
  };
  const points: PointCarte[] = pointContexte
    ? [{ id: "contexte", coordonnees: pointContexte.coordonnees, couleur: pointContexte.couleur, label: pointContexte.label }, pointActif]
    : [pointActif];

  async function localiserAvecGps() {
    setErreur(null);
    setLocalisationEnCours(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErreur("Autorisation de localisation refusée.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      onChangerCoordonnees({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      setErreur("Impossible de récupérer votre position.");
    } finally {
      setLocalisationEnCours(false);
    }
  }

  async function localiserParAdresse() {
    if (!adresseRecherche.trim()) {
      setErreur("Saisissez d'abord une adresse à rechercher.");
      return;
    }
    setErreur(null);
    setRechercheEnCours(true);
    try {
      const trouve = await geocoderAdresse(adresseRecherche, zone ?? undefined);
      if (!trouve) {
        setErreur("Adresse introuvable — ajustez le point directement sur la carte.");
        return;
      }
      onChangerCoordonnees(trouve);
    } finally {
      setRechercheEnCours(false);
    }
  }

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row flex-wrap gap-4">
        <Pressable onPress={localiserAvecGps} disabled={localisationEnCours} className="flex-row items-center gap-2 py-1">
          {localisationEnCours ? (
            <ActivityIndicator size="small" color="#C41E24" />
          ) : (
            <Ionicons name="locate-outline" size={16} color="#C41E24" />
          )}
          <Text className="font-texte-medium text-sm text-colimo-rouge">Ma position actuelle</Text>
        </Pressable>
        <Pressable onPress={localiserParAdresse} disabled={rechercheEnCours} className="flex-row items-center gap-2 py-1">
          {rechercheEnCours ? (
            <ActivityIndicator size="small" color="#C41E24" />
          ) : (
            <Ionicons name="search-outline" size={16} color="#C41E24" />
          )}
          <Text className="font-texte-medium text-sm text-colimo-rouge">Localiser cette adresse</Text>
        </Pressable>
      </View>

      {erreur && <Text className="mb-2 font-texte text-xs text-colimo-rouge">{erreur}</Text>}

      <CarteOSM points={points} pointDeplacableId={id} onDeplacerPoint={onChangerCoordonnees} hauteur={200} />

      <Text className="mt-1.5 font-texte text-xs text-colimo-neutre-fonce/50">
        {coordonnees
          ? "Glissez le point ou touchez la carte pour ajuster précisément."
          : "Touchez la carte pour placer le point, ou utilisez les raccourcis ci-dessus."}
      </Text>
    </View>
  );
}
