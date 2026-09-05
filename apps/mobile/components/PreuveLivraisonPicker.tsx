import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

export interface FichierPreuveLivraison {
  uri: string;
  mimeType: string;
}

interface PreuveLivraisonPickerProps {
  value: FichierPreuveLivraison | null;
  onChange: (fichier: FichierPreuveLivraison) => void;
}

// Contrairement à PreuveLitigePicker/PhotoPicker (galerie uniquement), la
// preuve de livraison doit pouvoir être prise sur l'instant (caméra) pour
// attester que le coursier est bien sur place au moment de la remise.
export default function PreuveLivraisonPicker({ value, onChange }: PreuveLivraisonPickerProps) {
  const [erreur, setErreur] = useState<string | null>(null);

  async function prendrePhoto() {
    setErreur(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErreur("Autorisation refusée pour utiliser l'appareil photo.");
      return;
    }
    const resultat = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!resultat.canceled && resultat.assets[0]) {
      onChange({ uri: resultat.assets[0].uri, mimeType: resultat.assets[0].mimeType ?? "image/jpeg" });
    }
  }

  async function choisirPhoto() {
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
      onChange({ uri: resultat.assets[0].uri, mimeType: resultat.assets[0].mimeType ?? "image/jpeg" });
    }
  }

  return (
    <View>
      <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">📸 Preuve de livraison</Text>

      {value ? (
        <Image source={{ uri: value.uri }} className="mb-3 h-40 w-full rounded-xl" resizeMode="cover" />
      ) : (
        <View className="mb-3 h-40 w-full items-center justify-center rounded-xl border border-dashed border-colimo-neutre-clair bg-white">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/50">Aucune photo pour l&apos;instant</Text>
        </View>
      )}

      <View className="flex-row gap-2">
        <Pressable onPress={prendrePhoto} className="flex-1 items-center rounded-xl bg-colimo-rouge py-3">
          <Text className="font-texte-medium text-sm text-white">Prendre une photo</Text>
        </Pressable>
        <Pressable onPress={choisirPhoto} className="flex-1 items-center rounded-xl border border-colimo-neutre-clair bg-white py-3">
          <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">Choisir une photo</Text>
        </Pressable>
      </View>

      {erreur && <Text className="mt-2 font-texte text-xs text-colimo-rouge">{erreur}</Text>}
    </View>
  );
}
