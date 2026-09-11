import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface CarteActionProps {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  onPress: () => void;
}

// Carte compacte pour la grille "Que souhaitez-vous faire ?" de la Home —
// icône + titre court, rien de plus (cf. consigne : cartes immédiatement
// compréhensibles, pas de long texte).
export default function CarteAction({ icone, titre, onPress }: CarteActionProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-w-[45%] flex-1 rounded-2xl border border-colimo-neutre-clair bg-white p-4 active:opacity-70"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-colimo-rouge-clair">
        <Ionicons name={icone} size={20} color="#C41E24" />
      </View>
      <Text className="mt-3 font-texte-medium text-sm text-colimo-neutre-fonce">{titre}</Text>
    </Pressable>
  );
}
