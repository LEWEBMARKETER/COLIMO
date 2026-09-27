import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

interface BottomSheetProps {
  visible: boolean;
  children: ReactNode;
}

// Bottom sheet fait main avec react-native-reanimated (déjà installé,
// aucune dépendance ajoutée — pas de react-native-gesture-handler non plus,
// ce composant n'a pas besoin d'être glissé/refermé au doigt pour son
// premier usage : un statut de recherche, pas une sélection). Toujours
// rendu comme frère direct dans l'arbre (jamais dans un <Modal> RN — les
// animations `exiting` de Reanimated ne fonctionnent pas à travers la
// surface native séparée d'un Modal).
export default function BottomSheet({ visible, children }: BottomSheetProps) {
  if (!visible) return null;
  return (
    <>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        className="bg-black/30"
      />
      <Animated.View
        entering={SlideInDown.duration(280)}
        exiting={SlideOutDown.duration(200)}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        className="rounded-t-3xl bg-white px-6 pb-8 pt-3"
      >
        <View className="mb-3 h-1 w-9 self-center rounded-full bg-colimo-neutre-clair" />
        {children}
      </Animated.View>
    </>
  );
}
