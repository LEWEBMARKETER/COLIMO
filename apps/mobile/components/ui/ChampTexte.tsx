import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface ChampTexteProps extends TextInputProps {
  label: string;
  icone?: keyof typeof Ionicons.glyphMap;
  className?: string;
}

export default function ChampTexte({
  label,
  icone,
  className = "",
  secureTextEntry,
  ...inputProps
}: ChampTexteProps) {
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

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
          secureTextEntry={secureTextEntry && !motDePasseVisible}
          className={`rounded-xl border border-colimo-neutre-clair bg-white py-3 font-texte text-colimo-neutre-fonce ${
            icone ? "pl-11" : "pl-4"
          } ${secureTextEntry ? "pr-11" : "pr-4"}`}
          {...inputProps}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setMotDePasseVisible((v) => !v)}
            hitSlop={8}
            style={{ position: "absolute", right: 14, zIndex: 1 }}
          >
            <Ionicons name={motDePasseVisible ? "eye-off-outline" : "eye-outline"} size={18} color="#2B262280" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
