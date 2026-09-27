import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Bouton from "@/components/ui/Bouton";

interface EmptyStateProps {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  description?: string;
  labelAction?: string;
  onAction?: () => void;
}

// Explique toujours ce qui se passe plutôt qu'une liste vide silencieuse
// (cf. colimo-mobile-ux) — un seul composant réutilisable au lieu d'un
// texte "Aucun élément" recréé à la main dans chaque écran.
export default function EmptyState({ icone, titre, description, labelAction, onAction }: EmptyStateProps) {
  return (
    <View className="items-center rounded-2xl border border-colimo-bordure bg-colimo-surface px-6 py-8">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-colimo-rouge-clair">
        <Ionicons name={icone} size={20} color="#C41E24" />
      </View>
      <Text className="mt-3 text-center font-titre text-sm text-colimo-neutre-fonce">{titre}</Text>
      {description && (
        <Text className="mt-1 max-w-[240px] text-center font-texte text-xs text-colimo-neutre-fonce/60">
          {description}
        </Text>
      )}
      {labelAction && onAction && <Bouton label={labelAction} onPress={onAction} className="mt-4 px-6 py-2.5" />}
    </View>
  );
}
