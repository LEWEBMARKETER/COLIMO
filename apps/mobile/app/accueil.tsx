import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Bouton from "@/components/ui/Bouton";
import CarteInfoConfiance from "@/components/ui/CarteInfoConfiance";

const INFORMATIONS_CLES: { icone: keyof typeof Ionicons.glyphMap; titre: string; description: string }[] = [
  { icone: "location-outline", titre: "Grand Libreville", description: "Livraisons dans les zones couvertes par COLIMO" },
  { icone: "bicycle-outline", titre: "Coursiers partenaires", description: "Un réseau de coursiers pour vos livraisons" },
  { icone: "navigate-outline", titre: "Suivi de course", description: "Suivez votre colis pendant son acheminement" },
  { icone: "shield-checkmark-outline", titre: "Livraison sécurisée", description: "Confirmation de livraison et preuve de remise" },
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

const SEUIL_DESKTOP = 860;

type ProfilHero = "particulier" | "commerce";

// Un seul Hero, deux discours — le profil ne change que le texte et les CTA,
// jamais la mise en page (cf. brief : "une seule expérience COLIMO avec une
// interface adaptée au profil", pas deux pages séparées).
const MESSAGES_HERO: Record<
  ProfilHero,
  { titre: string; accent: string; sousTitre: string; ctaPrincipal: string; ctaSecondaire: string }
> = {
  particulier: {
    titre: "Envoyez vos colis partout dans le",
    accent: "Grand Libreville",
    sousTitre:
      "Un coursier vérifié récupère votre colis en quelques minutes. Vous suivez chaque étape sur la carte, jusqu'à la remise en main propre.",
    ctaPrincipal: "Envoyer un colis",
    ctaSecondaire: "Devenir coursier",
  },
  commerce: {
    titre: "Livrez vos commandes",
    accent: "sans effort",
    sousTitre:
      "Confiez vos livraisons à des coursiers vérifiés, suivez-les en temps réel et laissez vos clients confirmer la réception — dès votre première commande.",
    ctaPrincipal: "Créer mon compte commerce",
    ctaSecondaire: "Se connecter",
  },
};

const PILLES_CONFIANCE: { icone: keyof typeof Ionicons.glyphMap; texte: string }[] = [
  { icone: "location-outline", texte: "Suivi en direct" },
  { icone: "checkmark-circle-outline", texte: "Preuve de livraison" },
  { icone: "card-outline", texte: "Espèces & Mobile Money" },
];

// Respecte la préférence système "réduire les animations" — désactive les
// boucles Animated ci-dessous plutôt que de les imposer indéfiniment.
function useReduireAnimations(): boolean {
  const [reduit, setReduit] = useState(false);
  useEffect(() => {
    let actif = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((valeur) => {
        if (actif) setReduit(valeur);
      })
      .catch(() => {});
    const abonnement = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (valeur: boolean) => {
      if (actif) setReduit(valeur);
    });
    return () => {
      actif = false;
      abonnement?.remove?.();
    };
  }, []);
  return reduit;
}

function GlowDecor() {
  return (
    <>
      <View
        pointerEvents="none"
        className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-colimo-rouge/10"
      />
      <View
        pointerEvents="none"
        className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-colimo-rouge/5"
      />
    </>
  );
}

const APERCU_PAR_PROFIL: Record<ProfilHero, { destination: string; delai: string; nom: string; note: string }> = {
  particulier: { destination: "Colis vers Bikélé", delai: "Arrivée dans 22 min", nom: "Steevy N.", note: "★ 4,9 · Moto" },
  commerce: { destination: "Commande vers Akanda", delai: "Arrivée dans 15 min", nom: "Grace O.", note: "★ 4,8 · Scooter" },
};

// Pas d'accès à de vraies photos/vidéos ici (pas de récupération d'images
// externes) : un mock d'écran de suivi, inspiré du Hero VitGo, plutôt qu'un
// visuel statique — point de repère qui monte, ETA, coursier, "Suivre".
function TelephoneApercu({ profil }: { profil: ProfilHero }) {
  const reduireAnimations = useReduireAnimations();
  const [hauteurTrajet, setHauteurTrajet] = useState(0);
  const trajet = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduireAnimations) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(trajet, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(500),
        Animated.timing(trajet, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(300),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [trajet, reduireAnimations]);
  const translateY = trajet.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(hauteurTrajet - 16, 0)] });
  const infos = APERCU_PAR_PROFIL[profil];

  return (
    <View className="w-full max-w-[280px] overflow-hidden rounded-[36px] border-[6px] border-colimo-noir-clair bg-white shadow-2xl">
      <View className="bg-colimo-rouge px-5 pb-6 pt-5">
        <Text className="font-texte text-xs text-white/75">{infos.destination}</Text>
        <Text className="mt-1 font-titre text-lg text-white">{infos.delai}</Text>
      </View>
      <View className="relative h-36 bg-colimo-fond px-5 py-4">
        <View
          onLayout={(e) => setHauteurTrajet(e.nativeEvent.layout.height)}
          className="absolute bottom-4 left-8 top-4 w-0.5 bg-colimo-neutre-clair"
        />
        <View className="absolute left-[27px] top-4 h-3 w-3 rounded-full bg-colimo-neutre-fonce/30" />
        <View className="absolute bottom-4 left-[27px] h-3 w-3 rounded-full bg-colimo-rouge" />
        {!reduireAnimations && (
          <Animated.View
            style={{ transform: [{ translateY }] }}
            className="absolute left-6 top-4 h-4 w-4 rounded-full border-2 border-white bg-colimo-rouge"
          />
        )}
      </View>
      <View className="flex-row items-center justify-between border-t border-colimo-neutre-clair px-5 py-3">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-colimo-rouge-clair">
            <Ionicons name="bicycle-outline" size={16} color="#C41E24" />
          </View>
          <View>
            <Text className="font-texte-medium text-xs text-colimo-neutre-fonce">{infos.nom}</Text>
            <Text className="font-texte text-[10px] text-colimo-neutre-fonce/50">{infos.note}</Text>
          </View>
        </View>
        <Text className="font-texte-medium text-xs text-colimo-rouge">Suivre</Text>
      </View>
      <View className="bg-colimo-noir px-5 py-3">
        <Text className="text-center font-texte-medium text-xs text-white">Partager le lien de suivi</Text>
      </View>
    </View>
  );
}

function SelecteurProfil({ profil, onChange }: { profil: ProfilHero; onChange: (p: ProfilHero) => void }) {
  return (
    <View className="flex-row self-start rounded-full bg-white/10 p-1">
      {(["particulier", "commerce"] as ProfilHero[]).map((valeur) => (
        <Pressable key={valeur} onPress={() => onChange(valeur)} hitSlop={4}>
          <View className={`rounded-full px-4 py-1.5 ${profil === valeur ? "bg-white" : ""}`}>
            <Text
              className={`font-texte-medium text-xs ${profil === valeur ? "text-colimo-noir" : "text-white/70"}`}
            >
              {valeur === "particulier" ? "Particulier" : "Commerce"}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function PilleConfiance({ icone, texte }: { icone: keyof typeof Ionicons.glyphMap; texte: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
      <Ionicons name={icone} size={13} color="#fff" />
      <Text className="font-texte-medium text-xs text-white/90">{texte}</Text>
    </View>
  );
}

export default function AccueilScreen() {
  const [yEtapes, setYEtapes] = useState(0);
  const [profil, setProfil] = useState<ProfilHero>("particulier");
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const desktop = width >= SEUIL_DESKTOP;
  const msg = MESSAGES_HERO[profil];

  // Commerce préremplit directement le bon type sur l'inscription (cf.
  // register-client.tsx#type) plutôt que d'obliger à rebasculer le
  // sélecteur une seconde fois.
  function allerCtaPrincipal() {
    if (profil === "commerce") {
      router.push({ pathname: "/(auth)/register-client", params: { type: "commerce" } });
    } else {
      router.push("/(auth)/register-client");
    }
  }

  function allerCtaSecondaire() {
    router.push(profil === "commerce" ? "/(auth)/login" : "/(auth)/register-coursier");
  }

  if (desktop) {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["top"]}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between border-b border-colimo-neutre-clair px-12 py-5">
            <Image source={require("../assets/logo-colimo.png")} style={{ width: 150, height: 43 }} resizeMode="contain" />
            <View className="flex-row items-center gap-8">
              <Text
                onPress={() => scrollRef.current?.scrollTo({ y: yEtapes, animated: true })}
                className="font-texte-medium text-sm text-colimo-neutre-fonce/70"
              >
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

          <View className="relative overflow-hidden bg-colimo-noir">
            <GlowDecor />
            <View className="mx-auto w-full max-w-6xl flex-row items-center gap-16 px-12 py-24">
              <View className="flex-1">
                <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-rouge">
                  Livraison à Libreville et environs · à partir de 2 000 FCFA
                </Text>
                <View className="mt-4">
                  <SelecteurProfil profil={profil} onChange={setProfil} />
                </View>
                <Text className="mt-5 font-titre-bold text-6xl leading-[1.05] text-white">
                  {msg.titre} <Text className="text-colimo-rouge">{msg.accent}</Text>
                </Text>
                <Text className="mt-5 max-w-md font-texte text-lg text-white/60">{msg.sousTitre}</Text>

                <View className="mt-8 flex-row flex-wrap gap-3">
                  <Bouton label={`${msg.ctaPrincipal} →`} onPress={allerCtaPrincipal} className="px-6 py-4" />
                  <Bouton label={msg.ctaSecondaire} variante="contour" onPress={allerCtaSecondaire} className="px-6 py-4" />
                </View>

                <View className="mt-6 flex-row flex-wrap gap-2">
                  {PILLES_CONFIANCE.map((pille) => (
                    <PilleConfiance key={pille.texte} icone={pille.icone} texte={pille.texte} />
                  ))}
                </View>
              </View>

              <View className="flex-1 items-center justify-center">
                <TelephoneApercu profil={profil} />
              </View>
            </View>
          </View>

          <View className="mx-auto w-full max-w-6xl px-12 pt-20">
            <View className="flex-row gap-16">
              <View className="flex-1">
                <Text className="font-titre text-2xl text-colimo-neutre-fonce">Ce qui est inclus</Text>
                <View className="mt-6 flex-row flex-wrap gap-4">
                  {INFORMATIONS_CLES.map((info) => (
                    <CarteInfoConfiance key={info.titre} icone={info.icone} titre={info.titre} description={info.description} />
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

          <View
            onLayout={(e) => setYEtapes(e.nativeEvent.layout.y)}
            className="mt-20 bg-colimo-noir px-12 py-16"
          >
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
            <Text className="mt-3 text-center font-texte text-xs text-colimo-neutre-fonce/40">
              © COLIMO {new Date().getFullYear()}. Tous droits réservés.
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

        <View className="relative mt-4 overflow-hidden rounded-b-[32px] bg-colimo-noir px-6 pb-10 pt-8">
          <GlowDecor />
          <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-rouge">
            Livraison à Libreville · à partir de 2 000 FCFA
          </Text>
          <View className="mt-3">
            <SelecteurProfil profil={profil} onChange={setProfil} />
          </View>
          <Text className="mt-4 font-titre-bold text-4xl leading-tight text-white">
            {msg.titre} <Text className="text-colimo-rouge">{msg.accent}</Text>
          </Text>
          <Text className="mt-3 font-texte text-base text-white/60">{msg.sousTitre}</Text>

          <View className="mt-6 gap-3">
            <Bouton label={`${msg.ctaPrincipal} →`} onPress={allerCtaPrincipal} />
            <Bouton label={msg.ctaSecondaire} variante="contour" onPress={allerCtaSecondaire} />
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {PILLES_CONFIANCE.map((pille) => (
              <PilleConfiance key={pille.texte} icone={pille.icone} texte={pille.texte} />
            ))}
          </View>

          <View className="mt-6 items-center">
            <TelephoneApercu profil={profil} />
          </View>
        </View>

        <View className="mt-10 px-6">
          <Text className="font-titre text-xl text-colimo-neutre-fonce">Ce qui est inclus</Text>
          <View className="mt-4 flex-row flex-wrap gap-3">
            {INFORMATIONS_CLES.map((info) => (
              <CarteInfoConfiance key={info.titre} icone={info.icone} titre={info.titre} description={info.description} />
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
          <Text className="mt-3 text-center font-texte text-xs text-colimo-neutre-fonce/40">
            © COLIMO {new Date().getFullYear()}. Tous droits réservés.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
