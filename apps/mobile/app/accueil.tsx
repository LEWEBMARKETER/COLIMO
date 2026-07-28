import { useState } from "react";
import { Image, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
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

const CHIFFRES_CLES: { icone: keyof typeof Ionicons.glyphMap; texte: string }[] = [
  { icone: "location-outline", texte: "6 zones desservies" },
  { icone: "time-outline", texte: "Suivi en temps réel" },
  { icone: "shield-checkmark-outline", texte: "Coursiers vérifiés" },
];

const SEUIL_DESKTOP = 860;

export default function AccueilScreen() {
  const [zone, setZone] = useState<Zone | null>(null);
  const { width } = useWindowDimensions();
  const desktop = width >= SEUIL_DESKTOP;

  const formulaire = (
    <>
      <Text className="font-titre text-base text-colimo-neutre-fonce">Envoyer un colis maintenant</Text>
      <ZoneSelector label="Votre zone" value={zone} onChange={setZone} />
      <Bouton label="Publier une course" onPress={() => router.push("/(auth)/register-client")} className="mt-1" />
      {zone && (
        <Text className="mt-3 text-center font-texte text-xs text-colimo-neutre-fonce/50">
          Zone sélectionnée : {ZONE_LABELS[zone]}
        </Text>
      )}
    </>
  );

  if (desktop) {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between border-b border-colimo-neutre-clair px-12 py-5">
            <Image source={require("../assets/logo-colimo.png")} style={{ width: 150, height: 43 }} resizeMode="contain" />
            <View className="flex-row items-center gap-8">
              <Text onPress={() => router.push("/faq")} className="font-texte-medium text-sm text-colimo-neutre-fonce/70">
                Comment ça marche
              </Text>
              <Text onPress={() => router.push("/faq")} className="font-texte-medium text-sm text-colimo-neutre-fonce/70">
                FAQ
              </Text>
              <Text onPress={() => router.push("/(auth)/login")} className="font-texte-medium text-sm text-colimo-rouge">
                Se connecter
              </Text>
              <Bouton
                label="Créer un compte"
                onPress={() => router.push("/(auth)/register-client")}
                className="px-6 py-3"
              />
            </View>
          </View>

          <View className="mx-auto w-full max-w-6xl px-12 pt-12">
            <View className="flex-row items-center gap-16 rounded-[40px] bg-colimo-noir p-16">
              <View className="flex-1">
                <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-rouge">
                  Livraison à Libreville et environs
                </Text>
                <Text className="mt-3 font-titre-bold text-6xl leading-[1.05] text-white">
                  Vos colis, livrés en toute confiance
                </Text>
                <Text className="mt-5 max-w-md font-texte text-lg text-white/60">
                  COLIMO connecte particuliers, commerces et coursiers vérifiés à Libreville et ses
                  environs.
                </Text>

                <Carte className="mt-8 w-full max-w-md" style={STYLE_OMBRE}>
                  {formulaire}
                </Carte>
              </View>

              <View className="flex-1 items-center justify-center">
                <View className="aspect-square w-full items-center justify-center rounded-[32px] bg-colimo-noir-clair p-10">
                  <View className="h-36 w-36 items-center justify-center rounded-full bg-colimo-rouge">
                    <Ionicons name="cube-outline" size={64} color="white" />
                  </View>
                  <View className="mt-10 w-full gap-3">
                    {CHIFFRES_CLES.map((chiffre) => (
                      <View key={chiffre.texte} className="flex-row items-center gap-3 rounded-full bg-white/10 px-4 py-3">
                        <Ionicons name={chiffre.icone} size={18} color="white" />
                        <Text className="font-texte-medium text-sm text-white">{chiffre.texte}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View className="mt-20 flex-row gap-16">
              <View className="flex-1">
                <Text className="font-titre text-2xl text-colimo-neutre-fonce">Ce qui est inclus</Text>
                <View className="mt-6 flex-row flex-wrap gap-x-8 gap-y-4">
                  {POINTS_CONFIANCE.map((point) => (
                    <View key={point} className="w-[45%] flex-row items-start gap-3">
                      <Text className="font-texte-medium text-colimo-rouge">✓</Text>
                      <Text className="flex-1 font-texte text-colimo-neutre-fonce/80">{point}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className="w-80 gap-3">
                <Bouton
                  label="Créer un compte"
                  variante="contour"
                  onPress={() => router.push("/(auth)/register-client")}
                />
                <Bouton
                  label="Devenir coursier"
                  variante="primaire"
                  onPress={() => router.push("/(auth)/register-coursier")}
                />
              </View>
            </View>
          </View>

          <View className="mt-20 bg-colimo-noir px-12 py-16">
            <View className="mx-auto w-full max-w-6xl">
              <Text className="font-titre text-2xl text-white">Comment fonctionne une course COLIMO</Text>
              <View className="mt-10 flex-row gap-12">
                {ETAPES.map((etape, index) => (
                  <View key={etape.titre} className="flex-1">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-colimo-rouge">
                      <Text className="font-texte-medium text-white">{index + 1}</Text>
                    </View>
                    <Text className="mt-4 font-texte-medium text-white">{etape.titre}</Text>
                    <Text className="mt-1 font-texte text-sm text-white/60">{etape.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="items-center px-12 py-10">
            <View className="flex-row gap-6">
              <Text onPress={() => router.push("/faq")} className="font-texte-medium text-sm text-colimo-rouge">
                Questions fréquentes
              </Text>
              <Text onPress={() => router.push("/cgu")} className="font-texte text-sm text-colimo-neutre-fonce/50">
                CGU
              </Text>
              <Text onPress={() => router.push("/confidentialite")} className="font-texte text-sm text-colimo-neutre-fonce/50">
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
          {formulaire}
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
