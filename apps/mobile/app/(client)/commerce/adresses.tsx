import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ZONE_LABELS,
  calculerPlanEffectif,
  type Commercant,
  type CommerceAdresseFavorite,
  type CommercePointDepart,
  type Zone,
} from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import {
  creerAdresseFavoriteCommerce,
  creerPointDepartCommerce,
  getAdressesFavoritesCommerce,
  getMonCommerce,
  getPointsDepartCommerce,
  supprimerAdresseFavoriteCommerce,
  supprimerPointDepartCommerce,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function AdressesScreen() {
  const { session } = useAuth();
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [favorites, setFavorites] = useState<CommerceAdresseFavorite[]>([]);
  const [pointsDepart, setPointsDepart] = useState<CommercePointDepart[]>([]);

  const [label, setLabel] = useState("");
  const [adresse, setAdresse] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [section, setSection] = useState<"favorites" | "depart">("favorites");

  useEffect(() => {
    if (!session) return;
    getMonCommerce(session.user.id).then((c) => {
      if (!c) return;
      setCommerce(c);
      getAdressesFavoritesCommerce(c.id).then(setFavorites);
      getPointsDepartCommerce(c.id).then(setPointsDepart);
    });
  }, [session]);

  const planEffectif = commerce ? calculerPlanEffectif(commerce) : "gratuit";
  const peutBusiness = planEffectif === "business";

  async function ajouter() {
    if (!commerce || !label.trim() || !adresse.trim()) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      if (section === "favorites") {
        const nouvelle = await creerAdresseFavoriteCommerce({
          commerceId: commerce.id,
          label: label.trim(),
          adresse: adresse.trim(),
          zone: zone ?? undefined,
        });
        setFavorites((prev) => [...prev, nouvelle]);
      } else {
        const nouveau = await creerPointDepartCommerce({
          commerceId: commerce.id,
          label: label.trim(),
          adresse: adresse.trim(),
          zone: zone ?? undefined,
        });
        setPointsDepart((prev) => [...prev, nouveau]);
      }
      setLabel("");
      setAdresse("");
      setZone(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'ajouter cette adresse.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function supprimerFavorite(id: string) {
    await supprimerAdresseFavoriteCommerce(id);
    setFavorites((prev) => prev.filter((a) => a.id !== id));
  }

  async function supprimerPointDepart(id: string) {
    await supprimerPointDepartCommerce(id);
    setPointsDepart((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-titre text-xl text-colimo-neutre-fonce">Adresses</Text>

        <View className="mt-4 flex-row gap-2">
          <Text
            onPress={() => setSection("favorites")}
            className={`rounded-full px-4 py-2 font-texte-medium text-sm ${
              section === "favorites" ? "bg-colimo-rouge text-white" : "bg-white text-colimo-neutre-fonce"
            }`}
          >
            Favorites
          </Text>
          <Text
            onPress={() => setSection("depart")}
            className={`rounded-full px-4 py-2 font-texte-medium text-sm ${
              section === "depart" ? "bg-colimo-rouge text-white" : "bg-white text-colimo-neutre-fonce"
            }`}
          >
            Points de départ
          </Text>
        </View>

        {section === "depart" && !peutBusiness ? (
          <Carte className="mt-4">
            <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">🔒 Fonctionnalité Pack Business</Text>
            <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/60">
              Les points de départ multiples permettent de choisir votre point de récupération à chaque course.
            </Text>
            <Bouton
              label="Découvrir l'offre"
              variante="contour"
              onPress={() => router.push("/(client)/commerce/decouvrir?feature=multi_points_depart")}
              className="mt-3"
            />
          </Carte>
        ) : (
          <>
            <Carte className="mt-4">
              <Text className="mb-2 font-texte text-xs text-colimo-neutre-fonce/60">
                {section === "favorites" ? `${favorites.length} / 10 adresses favorites` : `${pointsDepart.length} points de départ`}
              </Text>
              <ChampTexte label="Nom" value={label} onChangeText={setLabel} placeholder="Ex : Boutique, Dépôt, Entrepôt" />
              <ChampTexte label="Adresse" value={adresse} onChangeText={setAdresse} placeholder="Adresse précise" />
              <ZoneSelector label="Zone (optionnel)" value={zone} onChange={setZone} />
              {erreur && <Text className="mb-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}
              <Bouton label="Ajouter" onPress={ajouter} disabled={!label.trim() || !adresse.trim()} chargement={envoiEnCours} />
            </Carte>

            <View className="mt-4 gap-2">
              {(section === "favorites" ? favorites : pointsDepart).map((a) => (
                <Carte key={a.id} className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-texte-medium text-colimo-neutre-fonce">{a.label}</Text>
                    <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/60">{a.adresse}</Text>
                    {a.zone && <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/50">{ZONE_LABELS[a.zone]}</Text>}
                  </View>
                  <Text
                    onPress={() => (section === "favorites" ? supprimerFavorite(a.id) : supprimerPointDepart(a.id))}
                    className="font-texte-medium text-xs text-colimo-rouge"
                  >
                    Retirer
                  </Text>
                </Carte>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
