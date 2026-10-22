import { Image, type ImageSourcePropType, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import BadgeBientotDisponible from "./BadgeBientotDisponible";

type ActionCarteService = { type: "lien"; label: string; onPress: () => void } | { type: "bientot" };

interface CarteServiceHeroProps {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  texte: string;
  action: ActionCarteService;
  image?: ImageSourcePropType;
  imageDescription?: string;
}

// Carte de service réutilisée partout où une photo COLIMO illustre un
// module (Hero Livraison/Transport/Market, cartes partenaires) — un seul
// patron, jamais une variante par appelant. Sans `image` : fond clair
// d'origine (compat ascendante). Avec `image` : photo pleine carte +
// dégradé sombre progressif (lisibilité) + icône/titre/texte en blanc —
// cf. intégration des visuels publicitaires COLIMO.
export default function CarteServiceHero({ icone, titre, texte, action, image, imageDescription }: CarteServiceHeroProps) {
  const contenuAction =
    action.type === "lien" ? (
      <Pressable onPress={action.onPress} hitSlop={8} className="flex-row items-center gap-1">
        <Text className="font-texte-medium text-sm text-colimo-rouge">{action.label}</Text>
        <Ionicons name="arrow-forward" size={14} color="#C41E24" />
      </Pressable>
    ) : (
      <BadgeBientotDisponible />
    );

  if (!image) {
    return (
      <View className="flex-1 min-w-[220px] rounded-2xl bg-white p-5 shadow-sm">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-colimo-rouge-clair">
          <Ionicons name={icone} size={20} color="#C41E24" />
        </View>
        <Text className="mt-4 font-titre-bold text-base text-colimo-neutre-fonce">{titre}</Text>
        <Text className="mt-1.5 font-texte text-sm text-colimo-neutre-fonce/70">{texte}</Text>
        <View className="mt-4">{contenuAction}</View>
      </View>
    );
  }

  return (
    <View className="relative flex-1 min-w-[220px] overflow-hidden rounded-2xl" style={{ minHeight: 260 }}>
      <Image
        source={image}
        resizeMode="cover"
        accessibilityLabel={imageDescription ?? titre}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      />
      <LinearGradient
        colors={["rgba(24,20,15,0.05)", "rgba(24,20,15,0.92)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <View className="flex-1 justify-end p-5">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-white/90">
          <Ionicons name={icone} size={20} color="#C41E24" />
        </View>
        <Text className="mt-4 font-titre-bold text-base text-white">{titre}</Text>
        <Text className="mt-1.5 font-texte text-sm text-white/80">{texte}</Text>
        <View className="mt-4">{contenuAction}</View>
      </View>
    </View>
  );
}
