import { useRef, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  CATALOGUE_FONCTIONNALITES_PREMIUM,
  formatFCFA,
  PRIX_PACK_BUSINESS,
  PRIX_PACK_STARTER,
  ZONE_LABELS,
  zonesArriveeDesservies,
  zonesDepartDesservies,
  type Zone,
} from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import CarteInfoConfiance from "@/components/ui/CarteInfoConfiance";
import CarteServiceHero from "@/components/CarteServiceHero";
import BadgeBientotDisponible from "@/components/BadgeBientotDisponible";
import ChiffreCle from "@/components/ui/ChiffreCle";
import StatutChip from "@/components/ui/StatutChip";
import TitreSection from "@/components/ui/TitreSection";
import { EMAIL_SUPPORT, NUMERO_WHATSAPP, NUMERO_WHATSAPP_WA_ME } from "@/components/EcranSupport";
import { useInstallationPwa } from "@/lib/pwa";
import { useAuth } from "@/lib/AuthContext";

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

const ETAPES_LIVRAISON = [
  { titre: "Publiez votre demande", description: "Adresses de départ et d'arrivée, type de colis, mode de paiement." },
  { titre: "Un coursier accepte", description: "Un coursier vérifié, disponible dans votre zone, prend votre course en charge." },
  { titre: "Suivez et confirmez", description: "Statut en direct jusqu'à la livraison, puis notez votre expérience." },
];

// Pas de "suivi en direct" promis ici : le module Transport (demande client,
// devis, suivi de mission) n'est pas encore développé — cf. audit préalable.
// Ce texte décrit ce qui existe réellement : l'inscription transporteur et
// une mise en relation à venir, jamais une fonctionnalité non livrée.
const ETAPES_TRANSPORT = [
  { titre: "Décrivez votre besoin", description: "Déménagement, marchandises ou course volumineuse — précisez le véhicule nécessaire." },
  { titre: "Un transporteur vous recontacte", description: "Un transporteur partenaire vérifié vous propose un devis adapté." },
  { titre: "Programmez votre prestation", description: "Vous validez les modalités directement avec le transporteur retenu." },
];

const SEUIL_DESKTOP = 860;

type ProfilHero = "particulier" | "commerce";

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
      <View pointerEvents="none" className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-colimo-rouge/10" />
      <View pointerEvents="none" className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-colimo-rouge/5" />
      <View pointerEvents="none" className="absolute -left-20 top-1/3 h-56 w-56 rounded-full border border-white/[0.06]" />
    </>
  );
}

const APERCU_PAR_PROFIL: Record<ProfilHero, { prenomOuNom: string; initiale: string; destination: string; prix: string }> = {
  particulier: { prenomOuNom: "Steevy", initiale: "S", destination: "Libreville → Bikélé-Essassa", prix: "3 500 FCFA" },
  commerce: { prenomOuNom: "Le Comptoir", initiale: "C", destination: "Libreville → Akanda", prix: "3 000 FCFA" },
};

// Aperçu construit avec les mêmes composants que l'accueil réel de l'app
// (Carte, StatutChip, ChiffreCle, TitreSection) — une vraie capture
// d'écran fidèle, pas un mock inventé pour la page vitrine.
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

function EtapesListe({ etapes, sombreFond = true }: { etapes: typeof ETAPES_LIVRAISON; sombreFond?: boolean }) {
  return (
    <View className="mt-5 flex-row flex-wrap items-center gap-x-2 gap-y-2">
      {etapes.map((etape, index) => (
        <View key={etape.titre} className="flex-row items-center gap-2">
          <View className="h-6 w-6 items-center justify-center rounded-full bg-colimo-rouge">
            <Text className="font-texte-medium text-[11px] text-white">{index + 1}</Text>
          </View>
          <Text className={`font-texte-medium text-xs ${sombreFond ? "text-white/75" : "text-colimo-neutre-fonce/70"}`}>
            {etape.titre}
          </Text>
          {index < etapes.length - 1 && (
            <Ionicons name="chevron-forward" size={12} color={sombreFond ? "#ffffff55" : "#2B262255"} />
          )}
        </View>
      ))}
    </View>
  );
}

// Bande "zones desservies" — mêmes données que ZoneSelector (packages/shared
// pricing), jamais une liste réécrite à la main dans le texte marketing.
function BandeZonesDesservies({ desktop, titre = "Zones desservies" }: { desktop: boolean; titre?: string }) {
  return (
    <View className={desktop ? "mx-auto w-full max-w-6xl px-12" : "px-6"}>
      <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-neutre-fonce/40">{titre}</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {ZONES_DESSERVIES.map((zone) => (
          <View key={zone} className="flex-row items-center gap-1.5 rounded-full border border-colimo-neutre-clair bg-white px-3 py-1.5">
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
    <View className="flex-row self-start rounded-full bg-colimo-neutre-clair p-1">
      {(["particulier", "commerce"] as ProfilHero[]).map((valeur) => (
        <Pressable key={valeur} onPress={() => onChange(valeur)} hitSlop={4}>
          <View className={`rounded-full px-4 py-1.5 ${profil === valeur ? "bg-white shadow-sm" : ""}`}>
            <Text className={`font-texte-medium text-xs ${profil === valeur ? "text-colimo-noir" : "text-colimo-neutre-fonce/60"}`}>
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

// --- Header -----------------------------------------------------------

const ITEMS_SERVICES = [
  { icone: "cube-outline" as const, label: "Livraison", cible: "livraison" as const, bientot: false },
  { icone: "car-outline" as const, label: "Transport", cible: "transport" as const, bientot: false },
  // COLIMO Market n'est pas développé (aucun catalogue, aucune commande) —
  // indication explicite dans le menu lui-même, pas seulement dans la
  // section (besoin métier). "bientot" ne change que l'affichage, jamais
  // le comportement du clic : il scrolle toujours vers la vitrine, jamais
  // vers une commande.
  { icone: "storefront-outline" as const, label: "COLIMO Market", cible: "market" as const, bientot: true },
  { icone: "briefcase-outline" as const, label: "COLIMO Pro", cible: "pro" as const, bientot: false },
];

// Ligne de menu réutilisée par le dropdown desktop ET le panneau mobile
// (même contenu, même comportement) — un seul endroit pour l'indication
// "Bientôt disponible" plutôt que la dupliquer à chaque appelant.
function LigneMenuService({ item, onPress }: { item: (typeof ITEMS_SERVICES)[number]; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between rounded-xl px-3 py-2.5 hover:bg-colimo-neutre-clair">
      <View className="flex-row items-center gap-3">
        <Ionicons name={item.icone} size={16} color="#C41E24" />
        <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">{item.label}</Text>
      </View>
      {item.bientot && (
        <Text className="font-texte-medium text-[10px] text-colimo-neutre-fonce/40">Bientôt disponible</Text>
      )}
    </Pressable>
  );
}

const ITEMS_PARTENAIRES = [
  { icone: "bicycle-outline" as const, label: "Devenir coursier", route: "/(auth)/register-coursier" as const },
  { icone: "car-outline" as const, label: "Devenir transporteur", route: "/(auth)/register-transporteur" as const },
  { icone: "storefront-outline" as const, label: "Devenir commerce partenaire", route: "commerce" as const },
];

type CibleSection = "livraison" | "transport" | "market" | "pro" | "partenaires" | "commentCaMarche";

function allerDevenirCommerce() {
  router.push({ pathname: "/(auth)/register-client", params: { type: "commerce" } });
}

function EnteteDesktop({ onNaviguer }: { onNaviguer: (cible: CibleSection) => void }) {
  const [menuOuvert, setMenuOuvert] = useState<"services" | "partenaires" | null>(null);

  function choisirService(cible: CibleSection) {
    setMenuOuvert(null);
    onNaviguer(cible);
  }

  function choisirPartenaire(item: (typeof ITEMS_PARTENAIRES)[number]) {
    setMenuOuvert(null);
    if (item.route === "commerce") allerDevenirCommerce();
    else router.push(item.route);
  }

  return (
    <View className="relative z-20 flex-row items-center justify-between border-b border-colimo-neutre-clair px-12 py-5">
      <Image source={require("../assets/logo-colimo.png")} style={{ width: 150, height: 43 }} resizeMode="contain" />
      <View className="flex-row items-center gap-8">
        <View>
          <Pressable
            onPress={() => setMenuOuvert((v) => (v === "services" ? null : "services"))}
            className="flex-row items-center gap-1"
          >
            <Text className="font-texte-medium text-sm text-colimo-neutre-fonce/70">Nos services</Text>
            <Ionicons name={menuOuvert === "services" ? "chevron-up" : "chevron-down"} size={14} color="#2B2622B3" />
          </Pressable>
          {menuOuvert === "services" && (
            <View className="absolute left-0 top-9 w-72 rounded-2xl border border-colimo-neutre-clair bg-white p-2 shadow-lg">
              {ITEMS_SERVICES.map((item) => (
                <LigneMenuService key={item.cible} item={item} onPress={() => choisirService(item.cible)} />
              ))}
            </View>
          )}
        </View>

        <Text onPress={() => onNaviguer("commentCaMarche")} className="font-texte-medium text-sm text-colimo-neutre-fonce/70">
          Comment ça marche
        </Text>

        <View>
          <Pressable
            onPress={() => setMenuOuvert((v) => (v === "partenaires" ? null : "partenaires"))}
            className="flex-row items-center gap-1"
          >
            <Text className="font-texte-medium text-sm text-colimo-neutre-fonce/70">Devenir partenaire</Text>
            <Ionicons name={menuOuvert === "partenaires" ? "chevron-up" : "chevron-down"} size={14} color="#2B2622B3" />
          </Pressable>
          {menuOuvert === "partenaires" && (
            <View className="absolute left-0 top-9 w-64 rounded-2xl border border-colimo-neutre-clair bg-white p-2 shadow-lg">
              {ITEMS_PARTENAIRES.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => choisirPartenaire(item)}
                  className="flex-row items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-colimo-neutre-clair"
                >
                  <Ionicons name={item.icone} size={16} color="#C41E24" />
                  <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">{item.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Text onPress={() => router.push("/(auth)/login")} className="font-texte-medium text-sm text-colimo-rouge">
          Se connecter
        </Text>
        <Bouton label="Créer un compte" onPress={() => router.push("/(auth)/register-client")} className="px-6 py-3" />
      </View>
    </View>
  );
}

function EnteteMobile({ onNaviguer }: { onNaviguer: (cible: CibleSection) => void }) {
  const [ouvert, setOuvert] = useState(false);

  function choisir(action: () => void) {
    setOuvert(false);
    action();
  }

  return (
    <View className="relative z-20">
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Image source={require("../assets/logo-colimo.png")} style={{ width: 130, height: 37 }} resizeMode="contain" />
        <View className="flex-row items-center gap-4">
          <Text onPress={() => router.push("/(auth)/login")} className="font-texte-medium text-sm text-colimo-rouge">
            Se connecter
          </Text>
          <Pressable onPress={() => setOuvert((v) => !v)} hitSlop={12}>
            <Ionicons name={ouvert ? "close" : "menu-outline"} size={26} color="#2B2622" />
          </Pressable>
        </View>
      </View>

      {ouvert && (
        <View className="mx-6 mt-3 rounded-2xl border border-colimo-neutre-clair bg-white p-2 shadow-lg">
          <Text className="px-3 pb-1 pt-2 font-texte-medium text-[11px] uppercase tracking-widest text-colimo-neutre-fonce/40">
            Nos services
          </Text>
          {ITEMS_SERVICES.map((item) => (
            <LigneMenuService key={item.cible} item={item} onPress={() => choisir(() => onNaviguer(item.cible))} />
          ))}

          <Text
            onPress={() => choisir(() => onNaviguer("commentCaMarche"))}
            className="rounded-xl px-3 py-2.5 font-texte-medium text-sm text-colimo-neutre-fonce"
          >
            Comment ça marche
          </Text>

          <Text className="px-3 pb-1 pt-3 font-texte-medium text-[11px] uppercase tracking-widest text-colimo-neutre-fonce/40">
            Devenir partenaire
          </Text>
          {ITEMS_PARTENAIRES.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => choisir(() => (item.route === "commerce" ? allerDevenirCommerce() : router.push(item.route)))}
              className="flex-row items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <Ionicons name={item.icone} size={16} color="#C41E24" />
              <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">{item.label}</Text>
            </Pressable>
          ))}

          <View className="mt-2 border-t border-colimo-neutre-clair pt-2">
            <Bouton label="Créer un compte" onPress={() => choisir(() => router.push("/(auth)/register-client"))} />
          </View>
        </View>
      )}
    </View>
  );
}

// --- Hero multi-services ------------------------------------------------

function SectionHero({ desktop, session, type }: { desktop: boolean; session: unknown; type: string | undefined }) {
  function allerLivraison() {
    if (session && type === "client") router.push("/(client)/publish");
    else router.push("/(auth)/register-client");
  }

  const cartes = (
    <View className={desktop ? "mt-10 flex-row gap-4" : "mt-8 flex-col gap-3"}>
      <CarteServiceHero
        icone="cube-outline"
        titre="Livraison"
        texte="Envoyez vos colis partout dans le Grand Libreville."
        action={{ type: "lien", label: "Envoyer un colis", onPress: allerLivraison }}
      />
      <CarteServiceHero
        icone="car-outline"
        titre="Transport"
        texte="Déménagements, marchandises et courses volumineuses."
        action={{ type: "bientot" }}
      />
      <CarteServiceHero
        icone="storefront-outline"
        titre="COLIMO Market"
        texte="Vos produits préférés, directement chez vous."
        action={{ type: "bientot" }}
      />
    </View>
  );

  return (
    <View className="relative overflow-hidden">
      <FondDegrade />
      <View className={desktop ? "mx-auto w-full max-w-6xl px-12 py-20" : "px-6 py-10"}>
        <Text className="font-titre-bold leading-[1.05] text-white" style={{ fontSize: desktop ? 52 : 32 }}>
          Vos colis, vos marchandises, vos achats.
        </Text>
        <Text className="mt-1 font-titre-bold text-colimo-rouge" style={{ fontSize: desktop ? 52 : 32 }}>
          COLIMO s&apos;occupe du reste.
        </Text>
        <Text className={`mt-5 font-texte text-white/60 ${desktop ? "max-w-xl text-lg" : "text-base"}`}>
          Livrez un colis, organisez un transport ou découvrez les produits de nos commerces partenaires. Tout depuis
          une seule plateforme.
        </Text>

        <View className="mt-6 flex-row flex-wrap gap-2">
          {PILLES_CONFIANCE.map((pille) => (
            <PilleConfiance key={pille.texte} icone={pille.icone} texte={pille.texte} />
          ))}
          <PilleInstallationPwa />
        </View>

        {cartes}
      </View>
    </View>
  );
}

// --- Section Livraison ---------------------------------------------------

function SectionLivraison({
  desktop,
  profil,
  onChangeProfil,
  session,
  type,
  onLayout,
}: {
  desktop: boolean;
  profil: ProfilHero;
  onChangeProfil: (p: ProfilHero) => void;
  session: unknown;
  type: string | undefined;
  onLayout: (y: number) => void;
}) {
  function allerCtaPrincipal() {
    if (session && type === "client") {
      router.push("/(client)/publish");
      return;
    }
    if (profil === "commerce") {
      router.push({ pathname: "/(auth)/register-client", params: { type: "commerce" } });
    } else {
      router.push("/(auth)/register-client");
    }
  }

  const contenu = (
    <>
      <TitreSection>COLIMO Livraison</TitreSection>
      <View className="mt-2">
        <SelecteurProfil profil={profil} onChange={onChangeProfil} />
      </View>
      <Text className={`mt-4 font-titre-bold text-colimo-neutre-fonce ${desktop ? "text-3xl" : "text-2xl"}`}>
        Commandez une livraison en quelques minutes
      </Text>
      <Text className="mt-3 max-w-md font-texte text-colimo-neutre-fonce/70">
        Un coursier vérifié récupère votre colis, vous suivez chaque étape jusqu&apos;à la confirmation de remise.
        Espèces ou Mobile Money, tarifs inchangés.
      </Text>

      <View className="mt-6 flex-row flex-wrap gap-4">
        {INFORMATIONS_CLES.map((info) => (
          <CarteInfoConfiance key={info.titre} icone={info.icone} titre={info.titre} description={info.description} />
        ))}
      </View>

      <EtapesListe etapes={ETAPES_LIVRAISON} sombreFond={false} />

      <View className="mt-6">
        <Bouton label="Commander une livraison" onPress={allerCtaPrincipal} className={desktop ? "self-start px-6 py-4" : "py-3.5"} />
      </View>
    </>
  );

  return (
    <View onLayout={(e) => onLayout(e.nativeEvent.layout.y)} className={desktop ? "mx-auto mt-16 w-full max-w-6xl px-12" : "mt-12 px-6"}>
      {desktop ? (
        <View className="flex-row items-start gap-16">
          <View className="flex-1">{contenu}</View>
          <View className="w-80 items-center">
            <TelephoneApercu profil={profil} />
          </View>
        </View>
      ) : (
        <>
          {contenu}
          <View className="mt-6 items-center">
            <TelephoneApercu profil={profil} />
          </View>
        </>
      )}
      <View className="mt-10">
        <BandeZonesDesservies desktop={desktop} />
      </View>
    </View>
  );
}

// --- Section Transport ----------------------------------------------------

const POINTS_TRANSPORT = [
  { icone: "home-outline" as const, texte: "Déménagements" },
  { icone: "cube-outline" as const, texte: "Transport de marchandises" },
  { icone: "bag-handle-outline" as const, texte: "Courses volumineuses" },
  { icone: "car-sport-outline" as const, texte: "Véhicules utilitaires variés" },
];

function SectionTransport({ desktop, onLayout }: { desktop: boolean; onLayout: (y: number) => void }) {
  return (
    <View onLayout={(e) => onLayout(e.nativeEvent.layout.y)} className={desktop ? "mx-auto mt-20 w-full max-w-6xl px-12" : "mt-14 px-6"}>
      <TitreSection>COLIMO Transport</TitreSection>
      <Text className={`mt-2 font-titre-bold text-colimo-neutre-fonce ${desktop ? "text-3xl" : "text-2xl"}`}>
        Un transporteur partenaire vérifié pour vos besoins ponctuels
      </Text>
      <Text className="mt-3 max-w-xl font-texte text-colimo-neutre-fonce/70">
        Déménagement, marchandises à acheminer, achats volumineux : décrivez votre besoin, un transporteur partenaire
        de notre réseau vous recontacte avec un devis.
      </Text>

      <View className={`mt-6 flex-row flex-wrap gap-3 ${desktop ? "" : ""}`}>
        {POINTS_TRANSPORT.map((p) => (
          <View key={p.texte} className="flex-row items-center gap-2 rounded-full border border-colimo-neutre-clair bg-white px-3.5 py-2">
            <Ionicons name={p.icone} size={15} color="#C41E24" />
            <Text className="font-texte-medium text-xs text-colimo-neutre-fonce">{p.texte}</Text>
          </View>
        ))}
      </View>

      <Carte className="mt-6">
        <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">
          Transporteurs partenaires vérifiés par COLIMO avant toute mise en relation. Le suivi détaillé d&apos;une
          prestation sera disponible au fur et à mesure du déploiement du service.
        </Text>
      </Carte>

      <View className="mt-6 flex-row flex-wrap items-center gap-4">
        <BadgeBientotDisponible label="Demande de devis — bientôt disponible" />
      </View>
      <Text
        onPress={() => router.push("/(auth)/register-transporteur")}
        className="mt-4 font-texte-medium text-sm text-colimo-rouge"
      >
        Devenir transporteur partenaire →
      </Text>

      {/* Pas la même liste de zones que Livraison (besoin explicite : ne
          jamais présumer qu'une zone couverte en livraison l'est aussi en
          transport) — aucune donnée de couverture transport-par-zone
          n'existe encore côté plateforme (chaque transporteur déclare ses
          propres zones à l'inscription), donc un texte, jamais des puces
          de zones précises réutilisées à tort. */}
      <Text className="mt-8 max-w-md font-texte text-xs text-colimo-neutre-fonce/40">
        Zones couvertes progressivement dans le Grand Libreville, selon la disponibilité de nos transporteurs
        partenaires — à confirmer au moment de la demande.
      </Text>
    </View>
  );
}

// --- Section COLIMO Market -------------------------------------------------
// Vitrine pure — aucun catalogue, panier, commande, stock, paiement,
// commission ni interface vendeur Market (besoin métier explicite :
// Market n'est pas développé). Aucune table Supabase, aucune route, aucune
// API spécifique à Market n'existe ni n'est anticipée ici.
//
// Activation future : le jour où Market sera développé, seul le `action`
// de la carte Hero (SectionHero, action={{ type: "bientot" }}) et le badge
// ci-dessous changent — cette section garde la même structure (TitreSection
// + accroche + catégories + CTA), pas de refonte nécessaire.

const CATEGORIES_MARKET = [
  { icone: "sparkles-outline" as const, texte: "Produits d'entretien" },
  { icone: "basket-outline" as const, texte: "Épicerie sèche" },
  { icone: "briefcase-outline" as const, texte: "Fournitures professionnelles" },
];

function SectionMarket({ desktop, onLayout }: { desktop: boolean; onLayout: (y: number) => void }) {
  return (
    <View onLayout={(e) => onLayout(e.nativeEvent.layout.y)} className={desktop ? "mx-auto mt-20 w-full max-w-6xl px-12" : "mt-14 px-6"}>
      <TitreSection>COLIMO Market</TitreSection>
      <Text className={`mt-2 font-titre-bold text-colimo-neutre-fonce ${desktop ? "text-3xl" : "text-2xl"}`}>
        Vos produits préférés, directement chez vous.
      </Text>
      <Text className="mt-3 max-w-xl font-texte text-colimo-neutre-fonce/70">
        Une future vitrine des produits de nos commerces partenaires — sélectionnés, livrables directement par notre
        réseau de coursiers. Quelques catégories envisagées :
      </Text>

      <View className="mt-6 flex-row flex-wrap gap-3">
        {CATEGORIES_MARKET.map((c) => (
          <View key={c.texte} className="flex-row items-center gap-2 rounded-full border border-colimo-neutre-clair bg-white px-3.5 py-2">
            <Ionicons name={c.icone} size={15} color="#C41E24" />
            <Text className="font-texte-medium text-xs text-colimo-neutre-fonce">{c.texte}</Text>
          </View>
        ))}
      </View>

      <View className="mt-6">
        <BadgeBientotDisponible label="COLIMO Market — bientôt disponible" />
      </View>
      <Text onPress={allerDevenirCommerce} className="mt-4 font-texte-medium text-sm text-colimo-rouge">
        Devenir commerce partenaire →
      </Text>
    </View>
  );
}

// --- Section COLIMO Pro --------------------------------------------------

function SectionPro({ desktop, onLayout }: { desktop: boolean; onLayout: (y: number) => void }) {
  const fonctionnalites = CATALOGUE_FONCTIONNALITES_PREMIUM.slice(0, 4);

  return (
    <View onLayout={(e) => onLayout(e.nativeEvent.layout.y)} className="relative mt-20 overflow-hidden px-6 py-16">
      <FondDegrade inverse />
      <View className={desktop ? "mx-auto w-full max-w-6xl px-6" : ""}>
        <TitreSection sombre>COLIMO Pro</TitreSection>
        <Text className={`mt-2 font-titre-bold text-white ${desktop ? "text-3xl" : "text-2xl"}`}>
          La solution COLIMO pour les entreprises et commerces
        </Text>
        <Text className="mt-3 max-w-xl font-texte text-white/60">
          Équipe multi-comptes, points de départ multiples, export des commandes, coursiers favoris et support
          prioritaire — à partir de {formatFCFA(PRIX_PACK_STARTER)}/mois.
        </Text>

        <View className={desktop ? "mt-6 flex-row flex-wrap gap-4" : "mt-6 gap-3"}>
          {fonctionnalites.map((f) => (
            <View key={f.cle} className={`rounded-2xl bg-white/5 p-4 ${desktop ? "w-64" : ""}`}>
              <Text className="font-texte-medium text-sm text-white">{f.nom}</Text>
              <Text className="mt-1 font-texte text-xs text-white/50">{f.description}</Text>
            </View>
          ))}
        </View>

        <Text className="mt-4 font-texte text-xs text-white/40">
          Pack Business à {formatFCFA(PRIX_PACK_BUSINESS)}/mois pour les fonctionnalités avancées.
        </Text>

        <View className="mt-6">
          <Bouton label="Créer mon compte commerce" onPress={allerDevenirCommerce} className={desktop ? "self-start px-6 py-4" : "py-3.5"} />
        </View>
      </View>
    </View>
  );
}

// --- Section Partenaires --------------------------------------------------

function SectionPartenaires({ desktop, onLayout }: { desktop: boolean; onLayout: (y: number) => void }) {
  const cartes = [
    {
      icone: "bicycle-outline" as const,
      titre: "Coursiers",
      texte: "Effectuez des livraisons et développez votre activité.",
      cta: "Devenir coursier",
      onPress: () => router.push("/(auth)/register-coursier"),
    },
    {
      icone: "car-outline" as const,
      titre: "Transporteurs",
      texte: "Recevez des demandes de transport via COLIMO.",
      cta: "Devenir transporteur",
      onPress: () => router.push("/(auth)/register-transporteur"),
    },
    {
      icone: "storefront-outline" as const,
      titre: "Commerces",
      texte: "Proposez vos produits et développez vos ventes avec COLIMO Market.",
      cta: "Devenir partenaire",
      onPress: allerDevenirCommerce,
    },
  ];

  return (
    <View onLayout={(e) => onLayout(e.nativeEvent.layout.y)} className={desktop ? "mx-auto mt-20 w-full max-w-6xl px-12" : "mt-14 px-6"}>
      <TitreSection>Espace partenaires</TitreSection>
      <Text className={`mt-2 font-titre-bold text-colimo-neutre-fonce ${desktop ? "text-3xl" : "text-2xl"}`}>
        Rejoignez le réseau COLIMO
      </Text>

      <View className={desktop ? "mt-8 flex-row gap-5" : "mt-6 gap-3"}>
        {cartes.map((c) => (
          <View key={c.titre} className="flex-1 min-w-[220px] rounded-2xl border border-colimo-neutre-clair bg-white p-5">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-colimo-rouge-clair">
              <Ionicons name={c.icone} size={20} color="#C41E24" />
            </View>
            <Text className="mt-4 font-titre-bold text-base text-colimo-neutre-fonce">{c.titre}</Text>
            <Text className="mt-1.5 font-texte text-sm text-colimo-neutre-fonce/70">{c.texte}</Text>
            <Bouton label={c.cta} variante="contour" onPress={c.onPress} className="mt-4 py-3" />
          </View>
        ))}
      </View>
    </View>
  );
}

// --- Comment ça marche ------------------------------------------------

function SectionCommentCaMarche({ desktop, onLayout }: { desktop: boolean; onLayout: (y: number) => void }) {
  const [service, setService] = useState<"livraison" | "transport">("livraison");

  return (
    <View onLayout={(e) => onLayout(e.nativeEvent.layout.y)} className={desktop ? "mx-auto mt-20 w-full max-w-6xl px-12" : "mt-14 px-6"}>
      <TitreSection>Comment ça marche</TitreSection>
      <Text className={`mt-2 font-titre-bold text-colimo-neutre-fonce ${desktop ? "text-3xl" : "text-2xl"}`}>
        Choisissez votre service, effectuez votre demande, suivez votre commande ou prestation
      </Text>

      <View className="mt-5 flex-row self-start rounded-full bg-colimo-neutre-clair p-1">
        {(["livraison", "transport"] as const).map((valeur) => (
          <Pressable key={valeur} onPress={() => setService(valeur)}>
            <View className={`rounded-full px-4 py-1.5 ${service === valeur ? "bg-white shadow-sm" : ""}`}>
              <Text className={`font-texte-medium text-xs ${service === valeur ? "text-colimo-noir" : "text-colimo-neutre-fonce/60"}`}>
                {valeur === "livraison" ? "Livraison" : "Transport"}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View className={desktop ? "mt-8 flex-row gap-12" : "mt-6 gap-6"}>
        {(service === "livraison" ? ETAPES_LIVRAISON : ETAPES_TRANSPORT).map((etape, index) => (
          <View key={etape.titre} className={desktop ? "flex-1" : "flex-row gap-4"}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-colimo-rouge">
              <Text className="font-texte-medium text-white">{index + 1}</Text>
            </View>
            <View className={desktop ? "" : "flex-1"}>
              <Text className={`font-texte-medium text-colimo-neutre-fonce ${desktop ? "mt-4" : ""}`}>{etape.titre}</Text>
              <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/60">{etape.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- Footer -------------------------------------------------------------

function PiedDePage({ desktop, onNaviguer }: { desktop: boolean; onNaviguer: (cible: CibleSection) => void }) {
  return (
    <View className={`mt-20 border-t border-colimo-neutre-clair ${desktop ? "px-12 py-12" : "px-6 py-10"}`}>
      <View className={desktop ? "mx-auto flex w-full max-w-6xl flex-row justify-between gap-12" : "gap-8"}>
        <View className={desktop ? "max-w-xs" : ""}>
          <Image source={require("../assets/logo-colimo.png")} style={{ width: 130, height: 37 }} resizeMode="contain" />
          <Text className="mt-3 font-texte text-xs text-colimo-neutre-fonce/50">
            Livraison et transport dans le Grand Libreville — COLIMO Market, notre future vitrine de commerces
            partenaires, arrive bientôt.
          </Text>
        </View>

        <View className={desktop ? "flex-row gap-12" : "gap-6"}>
          <View>
            <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-neutre-fonce/40">Services</Text>
            {ITEMS_SERVICES.map((item) => (
              <Text
                key={item.cible}
                onPress={() => onNaviguer(item.cible)}
                className="mt-2.5 font-texte text-sm text-colimo-neutre-fonce/70"
              >
                {item.label}
                {item.bientot && <Text className="font-texte text-xs text-colimo-neutre-fonce/40"> · Bientôt disponible</Text>}
              </Text>
            ))}
          </View>

          <View>
            <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-neutre-fonce/40">Partenaires</Text>
            <Text onPress={() => onNaviguer("partenaires")} className="mt-2.5 font-texte text-sm text-colimo-neutre-fonce/70">
              Espace partenaires
            </Text>
            <Text onPress={() => onNaviguer("pro")} className="mt-2.5 font-texte text-sm text-colimo-neutre-fonce/70">
              COLIMO Pro
            </Text>
          </View>

          <View>
            <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-neutre-fonce/40">Informations</Text>
            <Text onPress={() => router.push("/faq")} className="mt-2.5 font-texte text-sm text-colimo-neutre-fonce/70">
              FAQ
            </Text>
            <Text onPress={() => router.push("/cgu")} className="mt-2.5 font-texte text-sm text-colimo-neutre-fonce/70">
              Conditions générales
            </Text>
            <Text onPress={() => router.push("/confidentialite")} className="mt-2.5 font-texte text-sm text-colimo-neutre-fonce/70">
              Confidentialité
            </Text>
          </View>

          <View>
            <Text className="font-texte-medium text-xs uppercase tracking-widest text-colimo-neutre-fonce/40">Contact</Text>
            <Text
              onPress={() => Linking.openURL(`https://wa.me/${NUMERO_WHATSAPP_WA_ME}`).catch(() => {})}
              className="mt-2.5 font-texte text-sm text-colimo-neutre-fonce/70"
            >
              {NUMERO_WHATSAPP}
            </Text>
            <Text
              onPress={() => Linking.openURL(`mailto:${EMAIL_SUPPORT}`).catch(() => {})}
              className="mt-2.5 font-texte text-sm text-colimo-neutre-fonce/70"
            >
              {EMAIL_SUPPORT}
            </Text>
          </View>
        </View>
      </View>

      <Text className="mt-8 text-center font-texte text-xs text-colimo-neutre-fonce/50">
        Zones desservies : {ZONES_DESSERVIES_LABEL}
      </Text>
      <Text className="mt-2 text-center font-texte text-xs text-colimo-neutre-fonce/40">
        © COLIMO {new Date().getFullYear()}. Tous droits réservés.
      </Text>
    </View>
  );
}

// --- Écran racine ---------------------------------------------------------

export default function AccueilScreen() {
  const { session, utilisateur } = useAuth();
  const [profil, setProfil] = useState<ProfilHero>("particulier");
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const desktop = width >= SEUIL_DESKTOP;
  const offsets = useRef<Partial<Record<CibleSection, number>>>({});

  function enregistrerOffset(cible: CibleSection) {
    return (y: number) => {
      offsets.current[cible] = y;
    };
  }

  function allerSection(cible: CibleSection) {
    const y = offsets.current[cible];
    if (y !== undefined) scrollRef.current?.scrollTo({ y, animated: true });
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["top"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: desktop ? 0 : 48 }} showsVerticalScrollIndicator={false}>
        {desktop ? <EnteteDesktop onNaviguer={allerSection} /> : <EnteteMobile onNaviguer={allerSection} />}

        <SectionHero desktop={desktop} session={session} type={utilisateur?.type} />

        <SectionLivraison
          desktop={desktop}
          profil={profil}
          onChangeProfil={setProfil}
          session={session}
          type={utilisateur?.type}
          onLayout={enregistrerOffset("livraison")}
        />

        <SectionTransport desktop={desktop} onLayout={enregistrerOffset("transport")} />
        <SectionMarket desktop={desktop} onLayout={enregistrerOffset("market")} />
        <SectionPro desktop={desktop} onLayout={enregistrerOffset("pro")} />
        <SectionPartenaires desktop={desktop} onLayout={enregistrerOffset("partenaires")} />
        <SectionCommentCaMarche desktop={desktop} onLayout={enregistrerOffset("commentCaMarche")} />

        <PiedDePage desktop={desktop} onNaviguer={allerSection} />
      </ScrollView>
    </SafeAreaView>
  );
}
