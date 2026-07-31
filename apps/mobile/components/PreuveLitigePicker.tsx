import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

export interface FichierPreuve {
  uri: string;
  mimeType: string;
}

interface PreuveLitigePickerProps {
  value: FichierPreuve[];
  onChange: (fichiers: FichierPreuve[]) => void;
}

export default function PreuveLitigePicker({ value, onChange }: PreuveLitigePickerProps) {
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouter() {
    setErreur(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErreur("Autorisation refusée pour accéder aux photos/vidéos.");
      return;
    }
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!resultat.canceled) {
      const nouveaux = resultat.assets.map((asset) => ({
        uri: asset.uri,
        mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      }));
      onChange([...value, ...nouveaux]);
    }
  }

  function retirer(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <View className="mb-4">
      <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">
        Photos ou vidéos à l&apos;appui (facultatif)
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {value.map((fichier, index) => (
          <Pressable
            key={`${fichier.uri}-${index}`}
            onPress={() => retirer(index)}
            className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-colimo-neutre-clair bg-white"
          >
            {fichier.mimeType.startsWith("image/") ? (
              <Image source={{ uri: fichier.uri }} className="h-20 w-20" resizeMode="cover" />
            ) : (
              <Text className="px-1 text-center font-texte text-[10px] text-colimo-neutre-fonce/60">
                Vidéo{"\n"}(retirer)
              </Text>
            )}
          </Pressable>
        ))}
        <Pressable
          onPress={ajouter}
          className="h-20 w-20 items-center justify-center rounded-xl border border-dashed border-colimo-neutre-clair bg-white"
        >
          <Text className="px-1 text-center font-texte text-xs text-colimo-neutre-fonce/60">+ Ajouter</Text>
        </Pressable>
      </View>
      {value.length > 0 && (
        <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/50">
          Appuie sur un fichier pour le retirer.
        </Text>
      )}
      {erreur && <Text className="mt-1 font-texte text-xs text-colimo-rouge">{erreur}</Text>}
    </View>
  );
}
