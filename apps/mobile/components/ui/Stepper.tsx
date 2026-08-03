import { Text, View } from "react-native";

interface StepperProps {
  etapes: string[];
  etapeActuelle: number;
}

export default function Stepper({ etapes, etapeActuelle }: StepperProps) {
  return (
    <View>
      <View className="flex-row items-center gap-1.5">
        {etapes.map((_, index) => (
          <View
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index <= etapeActuelle ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"
            }`}
          />
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
