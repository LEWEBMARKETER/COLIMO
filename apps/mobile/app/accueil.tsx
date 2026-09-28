import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ZONE_LABELS, zonesArriveeDesservies, zonesDepartDesservies, type Zone } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import CarteInfoConfiance from "@/components/ui/CarteInfoConfiance";
import ChiffreCle from "@/components/ui/ChiffreCle";
import StatutChip from "@/components/ui/StatutChip";
import TitreSection from "@/components/ui/TitreSection";
import { useInstallationPwa } from "@/lib/pwa";

// Dérivées de la grille tarifaire (packages/shared/pricing), jamais une
// liste séparée à recopier à la main — sinon elle finit par mentionner une
// zone non desservie (ex. PK12, cf. la correction de ZoneSelector).
const ZONES_DESSERVIES: Zone[] = Array.from(new Set([...zonesDepartDesservies(), ...zonesArriveeDesservies()]));
const ZONES_DESSERVIES_LABEL = ZONES_DESSERVIES.map((zone) => ZONE_LABELS[zone]).join(", ");

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

// Remplace l'ancien fond plat "bg-colimo-noir" par un dégradé de profondeur
// (mêmes tokens de marque, juste noir → noir clair en diagonale) + halos
// rouges + un anneau fin à peine visible — pas de nouvel asset, pas de
// couleur hors charte, juste plus de relief qu'un aplat uni. `inverse`
// permute les deux tons du dégradé pour éviter que deux sections sombres
// consécutives de la page paraissent identiques.
function FondDegrade({ inverse = false }: { inverse?: boolean }) {
  return (
    <>
      <LinearGradient
        colors={inverse ? ["#26201A", "#18140F"] : ["#18140F", "#26201A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <View
        pointerEvents="none"
        className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-colimo-rouge/10"
      />
      <View
        pointerEvents="none"
        className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-colimo-rouge/5"
      />
      <View
        pointerEvents="none"
        className="absolute -left-20 top-1/3 h-56 w-56 rounded-full border border-white/[0.06]"
      />
    </>
  );
}

const APERCU_PAR_PROFIL: Record<
  ProfilHero,
  { prenomOuNom: string; initiale: string; destination: string; prix: string }
> = {
  particulier: { prenomOuNom: "Steevy", initiale: "S", destination: "Libreville → Bikélé-Essassa", prix: "3 500 FCFA" },
  commerce: { prenomOuNom: "Le Comptoir", initiale: "C", destination: "Libreville → Akanda", prix: "3 000 FCFA" },
};

// Aperçu construit avec les mêmes composants que l'accueil réel de l'app
// (Carte, StatutChip, ChiffreCle, TitreSection) — une vraie capture
// d'écran fidèle, pas un mock inventé pour la page vitrine. Deux contenus
// (particulier/commerce) qui suivent le sélecteur de profil du hero, sinon
// ce dernier ne changeait que le texte à côté sans rien montrer.
function TelephoneApercu({ profil }: { profil: ProfilHero }) {
  const infos = APERCU_PAR_PROFIL[profil];

  return (
    <View className="w-full max-w-[280px] overflow-hidden rounded-[36px] border-[6px] border-colimo-noir-clair bg-colimo-fond shadow-2xl">
      <View className="px-5 pb-4 pt-5">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-colimo-rouge-clair">
            {profil === "commerce" ? (
              <Ionicons name="storefront-outline" size={16} color="#C41E24" />
            ) : (
              <Text className="font-titre text-sm text-colimo-rouge">{infos.initiale}</Text>
            )}
          </View>
          <Text className="flex-1 font-titre text-sm text-colimo-neutre-fonce" numberOfLines={1}>
            Bonjour {infos.prenomOuNom} 👋
          </Text>
        </View>

        <View className="mt-4">
          <TitreSection>Que faire ?</TitreSection>
          <View className="mt-2 flex-row gap-2">
            <View className="flex-1 items-center gap-1 rounded-2xl border border-colimo-neutre-clair bg-white py-3">
              <Ionicons name={profil === "commerce" ? "add-circle-outline" : "cube-outline"} size={18} color="#C41E24" />
              <Text className="text-center font-texte-medium text-[10px] text-colimo-neutre-fonce">
                {profil === "commerce" ? "Nouvelle\nlivraison" : "Envoyer\nun colis"}
              </Text>
            </View>
            <View className="flex-1 items-center gap-1 rounded-2xl border border-colimo-neutre-clair bg-white py-3">
              <Ionicons name={profil === "commerce" ? "stats-chart-outline" : "location-outline"} size={18} color="#C41E24" />
              <Text className="text-center font-texte-medium text-[10px] text-colimo-neutre-fonce">
                {profil === "commerce" ? "Statistiques" : "Suivre une\ncourse"}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-4">
          {profil === "commerce" ? (
            <Carte sombre>
              <View className="flex-row items-end justify-between">
                <ChiffreCle valeur="12" label="Livraisons ce mois" sombre taille="moyen" />
                <ChiffreCle valeur="98%" label="À l'heure" sombre taille="moyen" />
              </View>
            </Carte>
          ) : (
            <Carte sombre degrade>
              <Text className="font-texte-medium text-xs text-white/50">Course en cours</Text>
              <Text className="mt-1 font-texte-medium text-white">{infos.destination}</Text>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="font-titre text-white">{infos.prix}</Text>
                <StatutChip statut="en_cours" intensite="douce" />
              </View>
            </Carte>
          )}
        </View>
      </View>

      <View className="border-t border-colimo-neutre-clair bg-white px-5 py-3">
        <Text className="text-center font-texte-medium text-xs text-colimo-rouge">Dès 2 000 FCFA · Grand Libreville</Text>
      </View>
    </View>
  );
}

// Rappel compact des étapes (même contenu que la section "Comment fonctionne
// une course COLIMO" plus bas, jamais une liste séparée) — visible dès le
// hero, sans dupliquer les descriptions détaillées.
function EtapesCompactes({ sombreFond = true }: { sombreFond?: boolean }) {
  return (
    <View className="mt-5 flex-row flex-wrap items-center gap-x-2 gap-y-2">
      {ETAPES.map((etape, index) => (
        <View key={etape.titre} className="flex-row items-center gap-2">
          <View className="h-6 w-6 items-center justify-center rounded-full bg-colimo-rouge">
            <Text className="font-texte-medium text-[11px] text-white">{index + 1}</Text>
          </View>
          <Text className={`font-texte-medium text-xs ${sombreFond ? "text-white/75" : "text-colimo-neutre-fonce/70"}`}>
            {etape.titre}
          </Text>
          {index < ETAPES.length - 1 && (
            <Ionicons name="chevron-forward" size={12} color={sombreFond ? "#ffffff55" : "#2B262255"} />
          )}
        </View>
      ))}
    </View>
  );
}

// Bande "zones desservies" — mêmes données que ZoneSelector (packages/shared
// pricing), jamais une liste réécrite à la main dans le texte marketing.
function BandeZonesDesservies({ desktop }: { desktop: boolean }) {
  return (
    <View className={desktop ? "mx-auto w-full max-w-6xl px-12 pt-14" : "mt-10 px-6"}>
      <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-neutre-fonce/40">
        Zones desservies
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {ZONES_DESSERVIES.map((zone) => (
          <View
            key={zone}
            className="flex-row items-center gap-1.5 rounded-full border border-colimo-neutre-clair bg-white px-3 py-1.5"
          >
            <Ionicons name="location-outline" size={13} color="#C41E24" />
            <Text className="font-texte-medium text-xs text-colimo-neutre-fonce">{ZONE_LABELS[zone]}</Text>
          </View>
        ))}
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

// Pastille pleine (contraste avec les pastilles informatives ci-dessus) pour
// qu'elle se distingue comme la seule action du groupe. Web uniquement —
// useInstallationPwa renvoie tout à false sur l'app native, qui n'a pas de
// notion d'installation PWA.
function PilleInstallationPwa() {
  const { dejaInstallee, installationDirecte, instructionsManuelles, installer } = useInstallationPwa();
  if (dejaInstallee || (!installationDirecte && !instructionsManuelles)) return null;

  if (instructionsManuelles) {
    return (
      <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
        <Ionicons name="share-outline" size={13} color="#fff" />
        <Text className="font-texte-medium text-xs text-white/90">Partager → Sur l&apos;écran d&apos;accueil</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={installer} hitSlop={12}>
      <View className="flex-row items-center gap-1.5 rounded-full bg-colimo-rouge px-3 py-1.5">
        <Ionicons name="download-outline" size={13} color="#fff" />
        <Text className="font-texte-medium text-xs text-white">Installer l&apos;app</Text>
      </View>
    </Pressable>
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

          <View className="relative overflow-hidden">
            <FondDegrade />
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
                  <PilleInstallationPwa />
                </View>

                <EtapesCompactes />
              </View>

              <View className="flex-1 items-center justify-center">
                <TelephoneApercu profil={profil} />
              </View>
            </View>
          </View>

          <BandeZonesDesservies desktop />

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
            className="relative mt-20 overflow-hidden px-12 py-16"
          >
            <FondDegrade inverse />
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
              Zones desservies : {ZONES_DESSERVIES_LABEL}
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

        <View className="relative mt-4 overflow-hidden rounded-b-[32px] px-6 pb-10 pt-8">
          <FondDegrade />
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
            <PilleInstallationPwa />
          </View>

          <EtapesCompactes />

          <View className="mt-6 items-center">
            <TelephoneApercu profil={profil} />
          </View>
        </View>

        <BandeZonesDesservies desktop={false} />

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

        <View className="relative mt-12 overflow-hidden px-6 py-10">
          <FondDegrade inverse />
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
            Zones desservies : {ZONES_DESSERVIES_LABEL}
          </Text>
          <Text className="mt-3 text-center font-texte text-xs text-colimo-neutre-fonce/40">
            © COLIMO {new Date().getFullYear()}. Tous droits réservés.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
