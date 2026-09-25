import type { ReactNode } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface FondEnteteProps {
  children: ReactNode;
  className?: string;
}

// Fond léger pour l'en-tête des tableaux de bord (client particulier et
// commerce) — même grammaire visuelle que FondDegrade (accueil.tsx : dégradé
// + halos) mais recolorée en clair pour rester lisible sur un écran consulté
// plusieurs fois par jour (contrairement au Hero marketing, jamais de fond
// sombre ici). Le reste du tableau de bord (cartes de données) reste sur
// colimo-fond, inchangé.
export default function FondEntete({ children, className = "" }: FondEnteteProps) {
  return (
    <View className={`relative overflow-hidden rounded-b-[28px] ${className}`}>
      <LinearGradient
        colors={["#FAF8F5", "#FBE7E7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <View pointerEvents="none" className="absolute -right-16 -top-10 h-48 w-48 rounded-full bg-colimo-rouge/[0.06]" />
      <View pointerEvents="none" className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-colimo-rouge/[0.05]" />
      {children}
    </View>
  );
}
