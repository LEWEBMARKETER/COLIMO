import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

interface PhotoPickerProps {
  label: string;
  uri: string | null;
  onChange: (uri: string, mimeType: string) => void;
  rond?: boolean;
}

export default function PhotoPicker({ label, uri, onChange, rond = true }: PhotoPickerProps) {
  const [erreur, setErreur] = useState<string | null>(null);

  async function choisir() {
    setErreur(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErreur("Autorisation refusée pour accéder aux photos.");
      return;
    }
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!resultat.canceled && resultat.assets[0]) {
      onChange(resultat.assets[0].uri, resultat.assets[0].mimeType ?? "image/jpeg");
    }
  }

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">{label}</Text>
      <Pressable
        onPress={choisir}
        className={`items-center justify-center overflow-hidden border border-dashed border-colimo-neutre-clair bg-white ${
          rond ? "h-24 w-24 rounded-full" : "h-32 w-full rounded-xl"
        }`}
      >
        {uri ? (
          <Image source={{ uri }} className={rond ? "h-24 w-24" : "h-32 w-full"} resizeMode="cover" />
        ) : (
          <Text className="px-3 text-center text-xs text-colimo-neutre-fonce/60">+ Choisir une photo</Text>
        )}
      </Pressable>
      {erreur && <Text className="mt-1 text-xs text-colimo-rouge">{erreur}</Text>}
    </View>
  );
}
