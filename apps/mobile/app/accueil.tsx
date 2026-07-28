import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ZONE_LABELS, type Zone } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ZoneSelector from "@/components/ZoneSelector";

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
  const [zone, setZone] = useState<Zone | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between px-6 pt-2">
          <Image
            source={require("../assets/logo-colimo.png")}
            style={{ width: 130, height: 37 }}
            resizeMode="contain"
          />
          <Text
            onPress={() => router.push("/(auth)/login")}
            className="font-texte-medium text-sm text-colimo-rouge"
          >
            Se connecter
          </Text>
        </View>

        <View className="mt-4 rounded-b-[32px] bg-colimo-noir px-6 pb-20 pt-8">
          <Text className="font-titre-bold text-4xl leading-[44px] text-white">
            Vos colis, livrés{"\n"}en toute confiance
          </Text>
          <Text className="mt-3 font-texte text-base text-white/60">
            COLIMO connecte particuliers, commerces et coursiers vérifiés à
            Libreville et ses environs.
          </Text>
        </View>

        <Carte className="-mt-12 mx-6" style={STYLE_OMBRE}>
          <Text className="font-titre text-base text-colimo-neutre-fonce">
            Envoyer un colis maintenant
          </Text>
          <ZoneSelector label="Votre zone" value={zone} onChange={setZone} />
          <Bouton
            label="Publier une course"
            onPress={() => router.push("/(auth)/register-client")}
            className="mt-1"
          />
          {zone && (
            <Text className="mt-3 text-center font-texte text-xs text-colimo-neutre-fonce/50">
              Zone sélectionnée : {ZONE_LABELS[zone]}
            </Text>
          )}
        </Carte>

        <View className="mt-10 px-6">
          <Text className="font-titre text-xl text-colimo-neutre-fonce">Ce qui est inclus</Text>
          <View className="mt-4 gap-3">
            {POINTS_CONFIANCE.map((point) => (
              <View key={point} className="flex-row items-start gap-3">
                <Text className="font-texte-medium text-colimo-rouge">✓</Text>
                <Text className="flex-1 font-texte text-colimo-neutre-fonce/80">{point}</Text>
              </View>
            ))}
          </View>

          <View className="mt-6 flex-row gap-3">
            <Bouton
              label="Créer un compte"
              variante="contour"
              onPress={() => router.push("/(auth)/register-client")}
              className="flex-1"
            />
            <Bouton
              label="Devenir coursier"
              variante="primaire"
              onPress={() => router.push("/(auth)/register-coursier")}
              className="flex-1"
            />
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
          <View className="mt-3 flex-row gap-4">
            <Text onPress={() => router.push("/cgu")} className="font-texte text-xs text-colimo-neutre-fonce/50">
              CGU
            </Text>
            <Text
              onPress={() => router.push("/confidentialite")}
              className="font-texte text-xs text-colimo-neutre-fonce/50"
            >
              Confidentialité
            </Text>
          </View>
          <Text className="mt-2 text-center font-texte text-xs text-colimo-neutre-fonce/50">
            Zones desservies : Libreville, Akanda, Owendo, PK12, Bikélé, Ntoum
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const STYLE_OMBRE = {
  shadowColor: "#18140F",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 20,
  elevation: 6,
};
