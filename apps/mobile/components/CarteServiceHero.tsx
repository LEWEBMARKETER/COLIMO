import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import BadgeBientotDisponible from "./BadgeBientotDisponible";

type ActionCarteService = { type: "lien"; label: string; onPress: () => void } | { type: "bientot" };

interface CarteServiceHeroProps {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  texte: string;
  action: ActionCarteService;
}

// Carte de service du Hero multi-services (Livraison/Transport/Boutique) —
// un seul patron pour les 3, jamais une variante par service copiée à la
// main. Fond clair volontaire (contraste sur le FondDegrade sombre du
// Hero), CTA en lien discret (pas un Bouton plein — 3 CTA de même poids
// visuel sur une même rangée seraient trop lourds, cf. "un seul CTA
// dominant par écran" — ici le CTA du Hero global reste celui du
// profil sélectionné, ces cartes sont secondaires/exploratoires).
export default function CarteServiceHero({ icone, titre, texte, action }: CarteServiceHeroProps) {
  return (
    <View className="flex-1 min-w-[220px] rounded-2xl bg-white p-5 shadow-sm">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-colimo-rouge-clair">
        <Ionicons name={icone} size={20} color="#C41E24" />
      </View>
      <Text className="mt-4 font-titre-bold text-base text-colimo-neutre-fonce">{titre}</Text>
      <Text className="mt-1.5 font-texte text-sm text-colimo-neutre-fonce/70">{texte}</Text>

      <View className="mt-4">
        {action.type === "lien" ? (
          <Pressable onPress={action.onPress} hitSlop={8} className="flex-row items-center gap-1">
            <Text className="font-texte-medium text-sm text-colimo-rouge">{action.label}</Text>
            <Ionicons name="arrow-forward" size={14} color="#C41E24" />
          </Pressable>
        ) : (
          <BadgeBientotDisponible />
        )}
      </View>
    </View>
  );
}
