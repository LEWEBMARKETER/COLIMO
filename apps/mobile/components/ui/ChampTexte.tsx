import { Text, TextInput, View, type TextInputProps } from "react-native";

interface ChampTexteProps extends TextInputProps {
  label: string;
  className?: string;
}

export default function ChampTexte({ label, className = "", ...inputProps }: ChampTexteProps) {
  return (
    <View className={`mb-4 ${className}`}>
      <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">{label}</Text>
      <TextInput
        placeholderTextColor="#2B262280"
        className="rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 font-texte text-colimo-neutre-fonce"
        {...inputProps}
      />
    </View>
  );
}
