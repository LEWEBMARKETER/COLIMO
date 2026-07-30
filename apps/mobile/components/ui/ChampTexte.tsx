import { Text, TextInput, View, type TextInputProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface ChampTexteProps extends TextInputProps {
  label: string;
  icone?: keyof typeof Ionicons.glyphMap;
  className?: string;
}

export default function ChampTexte({ label, icone, className = "", ...inputProps }: ChampTexteProps) {
  return (
    <View className={`mb-4 ${className}`}>
      <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">{label}</Text>
      <View className="relative justify-center">
        {icone && (
          <Ionicons
            name={icone}
            size={18}
            color="#2B262280"
            style={{ position: "absolute", left: 16, zIndex: 1 }}
          />
        )}
        <TextInput
          placeholderTextColor="#2B262280"
          className={`rounded-xl border border-colimo-neutre-clair bg-white py-3 font-texte text-colimo-neutre-fonce ${
            icone ? "pl-11 pr-4" : "px-4"
          }`}
          {...inputProps}
        />
      </View>
    </View>
  );
}
