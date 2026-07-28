import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Bouton from "@/components/ui/Bouton";

const POINTS_CONFIANCE = [
  "Coursiers vérifiés avant activation de leur compte",
  "Prix affiché avant de valider votre commande",
  "Suivi du statut de votre course en temps réel",
  "Chat intégré avec votre coursier pendant la livraison",
  "Notation dans les deux sens après chaque course",
];

const ETAPES = [
  {
    titre: "Publiez votre demande",
    description: "Adresses de départ et d'arrivée, type de colis, mode de paiement.",
  },
  {
    titre: "Un coursier accepte",
    description: "Un coursier vérifié, disponible dans votre zone, prend votre course en charge.",
  },
  {
    titre: "Suivez et confirmez",
    description: "Statut en direct jusqu'à la livraison, puis notez votre expérience.",
  },
];

export default function AccueilScreen() {
  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-6 pt-10">
          <Image
            source={require("../assets/logo-colimo.png")}
            style={{ width: 180, height: 51 }}
            resizeMode="contain"
          />

          <Text className="mt-8 font-titre-bold text-3xl leading-tight text-colimo-neutre-fonce">
            Vos colis, livrés en toute confiance
          </Text>
          <Text className="mt-3 font-texte text-base text-colimo-neutre-fonce/70">
            COLIMO connecte particuliers, commerces et coursiers à Libreville et ses
            environs. Tarif visible avant de commander, coursiers vérifiés, suivi en
            temps réel.
          </Text>

          <View className="mt-8 gap-3">
            <Bouton label="Se connecter" onPress={() => router.push("/(auth)/login")} />
            <Bouton
              label="Créer un compte"
              variante="contour"
              onPress={() => router.push("/(auth)/register-client")}
            />
          </View>
        </View>

        <View className="mt-12 px-6">
          <Text className="font-titre text-xl text-colimo-neutre-fonce">Ce qui est inclus</Text>
          <View className="mt-4 gap-3">
            {POINTS_CONFIANCE.map((point) => (
              <View key={point} className="flex-row items-start gap-3">
                <Text className="font-texte-medium text-colimo-rouge">✓</Text>
                <Text className="flex-1 font-texte text-colimo-neutre-fonce/80">{point}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-12 bg-colimo-noir px-6 py-10">
          <Text className="font-titre text-xl text-white">Comment fonctionne une course COLIMO</Text>
          <View className="mt-6 gap-6">
            {ETAPES.map((etape, index) => (
              <View key={etape.titre} className="flex-row gap-4">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-colimo-rouge">
                  <Text className="font-texte-medium text-white">{index + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-texte-medium text-white">{etape.titre}</Text>
                  <Text className="mt-1 font-texte text-sm text-white/60">{etape.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-8 items-center px-6">
          <Text
            onPress={() => router.push("/faq")}
            className="font-texte-medium text-sm text-colimo-rouge"
          >
            Questions fréquentes
          </Text>
          <Text className="mt-2 text-center font-texte text-xs text-colimo-neutre-fonce/50">
            Zones desservies : Libreville, Akanda, Owendo, PK12, Bikélé, Ntoum
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
