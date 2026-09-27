import { useEffect } from "react";
import { View, type ViewProps } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

// Remplace un ActivityIndicator générique par un placeholder qui évoque déjà
// la forme du contenu à venir — LOT 1 de la refonte visuelle. Seule
// animation en boucle : un fondu doux, jamais un mouvement qui distrait.
export default function Skeleton({ className, style, ...props }: ViewProps) {
  const opacite = useSharedValue(0.5);
  useEffect(() => {
    opacite.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacite]);
  const styleAnime = useAnimatedStyle(() => ({ opacity: opacite.value }));
  return <Animated.View className={`rounded-md bg-colimo-neutre-clair ${className ?? ""}`} style={[styleAnime, style]} {...props} />;
}

// Gabarit prêt à l'emploi pour la liste "Vos dernières livraisons"
// (CarteCourseRecente) — mêmes dimensions que la vraie carte.
export function CarteCourseRecenteSkeleton() {
  return (
    <View className="mr-3 w-64 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Skeleton style={{ width: 70, height: 12 }} />
        <Skeleton style={{ width: 50, height: 18, borderRadius: 999 }} />
      </View>
      <Skeleton style={{ width: "80%", height: 14, marginTop: 10 }} />
      <View className="mt-3 flex-row items-center justify-between">
        <Skeleton style={{ width: 60, height: 11 }} />
        <Skeleton style={{ width: 50, height: 14 }} />
      </View>
    </View>
  );
}
