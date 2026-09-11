import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface CarteInfoConfianceProps {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  description: string;
}

// Petites cartes rassurantes de la Home (couverture, coursiers, suivi,
// sécurité) — volontairement statiques et courtes : ne pas transformer
// cette section en long texte marketing.
export default function CarteInfoConfiance({ icone, titre, description }: CarteInfoConfianceProps) {
  return (
    <View className="min-w-[47%] flex-1 rounded-xl bg-white p-3">
      <Ionicons name={icone} size={18} color="#C41E24" />
      <Text className="mt-2 font-texte-medium text-xs text-colimo-neutre-fonce">{titre}</Text>
      <Text className="mt-0.5 font-texte text-[11px] leading-4 text-colimo-neutre-fonce/60">{description}</Text>
    </View>
  );
}
