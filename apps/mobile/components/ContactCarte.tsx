import { Linking, Text, View } from "react-native";
import { lienGoogleMaps } from "@colimo/shared";
import Ionicons from "@expo/vector-icons/Ionicons";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";

interface ContactCarteProps {
  titre: string;
  nom: string | null;
  telephone: string | null;
  adresse: string;
  repere: string | null;
  latitude?: number;
  longitude?: number;
  appelFerme?: boolean;
}

export default function ContactCarte({
  titre,
  nom,
  telephone,
  adresse,
  repere,
  latitude,
  longitude,
  appelFerme = false,
}: ContactCarteProps) {
  return (
    <Carte className="mb-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">{titre}</Text>
        <Ionicons
          name="navigate-outline"
          size={18}
          color="#C41E24"
          onPress={() => Linking.openURL(lienGoogleMaps({ latitude, longitude, adresse }))}
        />
      </View>
      <Text className="mt-1 font-texte-medium text-colimo-neutre-fonce">{nom ?? titre}</Text>
      <Text className="mt-0.5 font-texte text-sm text-colimo-neutre-fonce/70">{adresse}</Text>
      {repere && <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/50">Repère : {repere}</Text>}
      {telephone && !appelFerme && (
        <Bouton
          label={`Appeler${nom ? ` ${nom}` : ""}`}
          variante="contour"
          onPress={() => Linking.openURL(`tel:${telephone}`)}
          className="mt-3 py-2.5"
        />
      )}
    </Carte>
  );
}
