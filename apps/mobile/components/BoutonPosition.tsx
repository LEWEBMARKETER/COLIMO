import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";

interface BoutonPositionProps {
  onLocalisation: (latitude: number, longitude: number) => void;
  label?: string;
}

export default function BoutonPosition({ onLocalisation, label = "Utiliser ma position actuelle" }: BoutonPositionProps) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function localiser() {
    setErreur(null);
    setEnCours(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErreur("Autorisation de localisation refusée.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      onLocalisation(position.coords.latitude, position.coords.longitude);
    } catch {
      setErreur("Impossible de récupérer votre position.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <View className="-mt-2 mb-4">
      <Pressable onPress={localiser} disabled={enCours} className="flex-row items-center gap-2 self-start py-1">
        {enCours ? (
          <ActivityIndicator size="small" color="#C41E24" />
        ) : (
          <Ionicons name="locate-outline" size={16} color="#C41E24" />
        )}
        <Text className="font-texte-medium text-sm text-colimo-rouge">{label}</Text>
      </Pressable>
      {erreur && <Text className="mt-1 font-texte text-xs text-colimo-rouge">{erreur}</Text>}
    </View>
  );
}
