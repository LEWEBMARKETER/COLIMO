import { Pressable, ScrollView, Text, View } from "react-native";

interface OptionPastille<T extends string> {
  valeur: T;
  label: string;
}

interface GroupePastillesProps<T extends string> {
  label: string;
  options: OptionPastille<T>[];
  value: T | null;
  onChange: (valeur: T) => void;
  defilement?: boolean;
  className?: string;
}

export default function GroupePastilles<T extends string>({
  label,
  options,
  value,
  onChange,
  defilement = false,
  className = "",
}: GroupePastillesProps<T>) {
  const pastilles = options.map((option) => {
    const selectionne = value === option.valeur;
    return (
      <Pressable
        key={option.valeur}
        onPress={() => onChange(option.valeur)}
        className={`rounded-full border px-4 py-2 ${
          selectionne ? "border-colimo-rouge bg-colimo-rouge" : "border-colimo-neutre-clair bg-white"
        }`}
      >
        <Text className={`font-texte-medium ${selectionne ? "text-white" : "text-colimo-neutre-fonce"}`}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View className={`mb-4 ${className}`}>
      <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">{label}</Text>
      {defilement ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">{pastilles}</View>
        </ScrollView>
      ) : (
        <View className="flex-row flex-wrap gap-2">{pastilles}</View>
      )}
    </View>
  );
}
