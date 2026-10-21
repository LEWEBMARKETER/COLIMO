import { Text, View } from "react-native";

interface TitreSectionProps {
  children: string;
  // Même besoin que Carte (sombre/degrade) : certaines sections (ex.
  // COLIMO Pro sur fond dégradé sombre) ont besoin d'un titre lisible sur
  // fond foncé — étend le composant plutôt que d'en écrire un autre.
  sombre?: boolean;
}

// Repère visuel constant pour les titres de section des tableaux de bord
// (barre d'accent + titre) — LOT 1 de la refonte visuelle, hiérarchie sans
// changer le texte ni la taille des titres existants.
export default function TitreSection({ children, sombre = false }: TitreSectionProps) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-4 w-1 rounded-full bg-colimo-rouge" />
      <Text className={`font-titre text-base ${sombre ? "text-white" : "text-colimo-neutre-fonce"}`}>{children}</Text>
    </View>
  );
}
