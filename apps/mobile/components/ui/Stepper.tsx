import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { colors } from "@colimo/shared";

interface StepperProps {
  etapes: string[];
  etapeActuelle: number;
}

// Transition de couleur animée plutôt qu'un changement instantané — la
// progression se "voit" avancer plutôt que de sauter d'un état à l'autre.
function Segment({ actif }: { actif: boolean }) {
  const style = useAnimatedStyle(() => ({
    backgroundColor: withTiming(actif ? colors.rougePrincipal : colors.neutreClair, { duration: 200 }),
  }));
  return <Animated.View style={style} className="h-1.5 flex-1 rounded-full" />;
}

export default function Stepper({ etapes, etapeActuelle }: StepperProps) {
  return (
    <View>
      <View className="flex-row items-center gap-1.5">
        {etapes.map((_, index) => (
          <Segment key={index} actif={index <= etapeActuelle} />
        ))}
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
          Étape {etapeActuelle + 1}/{etapes.length}
        </Text>
        <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">{etapes[etapeActuelle]}</Text>
      </View>
    </View>
  );
}
