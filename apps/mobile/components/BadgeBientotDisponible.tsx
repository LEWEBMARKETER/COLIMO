import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

// Badge neutre (ni succès ni erreur — aucun des deux ne correspond à "pas
// encore disponible") utilisé partout où une fonctionnalité annoncée sur
// la landing page n'est pas encore accessible (COLIMO Transport — demande
// de devis, COLIMO Boutique — catalogue) : jamais un CTA qui mène vers un
// écran qui n'existe pas, jamais une fausse promesse de fonctionnalité.
export default function BadgeBientotDisponible({ label = "Bientôt disponible" }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-1.5 self-start rounded-full bg-colimo-neutre-clair px-3 py-1.5">
      <Ionicons name="time-outline" size={13} color="#2B2622" style={{ opacity: 0.5 }} />
      <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/60">{label}</Text>
    </View>
  );
}
