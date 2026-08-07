import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { calculerPlanEffectif, type Commercant, type CommerceCoursierFavori, type CoursierAvecUtilisateur } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import NoteEtoiles from "@/components/NoteEtoiles";
import { ajouterCoursierFavori, getCoursiers, getCoursiersFavorisCommerce, getMonCommerce, retirerCoursierFavori } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function CoursiersFavorisScreen() {
  const { session } = useAuth();
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [coursiers, setCoursiers] = useState<CoursierAvecUtilisateur[]>([]);
  const [favoris, setFavoris] = useState<CommerceCoursierFavori[]>([]);

  useEffect(() => {
    if (!session) return;
    getMonCommerce(session.user.id).then((c) => {
      if (!c) return;
      setCommerce(c);
      getCoursiers().then(setCoursiers);
      getCoursiersFavorisCommerce(c.id).then(setFavoris);
    });
  }, [session]);

  const planEffectif = commerce ? calculerPlanEffectif(commerce) : "gratuit";

  async function basculer(coursierId: string) {
    if (!commerce) return;
    const existant = favoris.find((f) => f.coursierId === coursierId);
    if (existant) {
      await retirerCoursierFavori(existant.id);
      setFavoris((prev) => prev.filter((f) => f.id !== existant.id));
    } else {
      const nouveau = await ajouterCoursierFavori(commerce.id, coursierId);
      setFavoris((prev) => [...prev, nouveau]);
    }
  }

  if (planEffectif !== "business") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-titre text-lg text-colimo-neutre-fonce">🔒 Pack Business</Text>
          <Text className="mt-2 text-center font-texte text-sm text-colimo-neutre-fonce/60">
            Suivez vos coursiers préférés — sans garantie d&apos;attribution automatique.
          </Text>
          <Bouton
            label="Découvrir l'offre"
            onPress={() => router.push("/(client)/commerce/decouvrir?feature=coursiers_favoris")}
            className="mt-6"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-titre text-xl text-colimo-neutre-fonce">Coursiers favoris</Text>
        <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/50">
          Une préférence, pas une garantie d&apos;attribution.
        </Text>

        <View className="mt-4 gap-2">
          {coursiers.map((c) => {
            const estFavori = favoris.some((f) => f.coursierId === c.utilisateurId);
            return (
              <Carte key={c.id} className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-texte-medium text-colimo-neutre-fonce">
                    {c.utilisateur.prenom ? `${c.utilisateur.prenom} ${c.utilisateur.nom}` : c.utilisateur.nom}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <NoteEtoiles note={c.noteMoyenne} />
                    <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                      {c.nombreLivraisons} livraison{c.nombreLivraisons > 1 ? "s" : ""} · {c.disponibilite ? "Disponible" : "Indisponible"}
                    </Text>
                  </View>
                </View>
                <Text
                  onPress={() => basculer(c.utilisateurId)}
                  className={`font-texte-medium text-xs ${estFavori ? "text-colimo-rouge" : "text-colimo-neutre-fonce/50"}`}
                >
                  {estFavori ? "★ Favori" : "☆ Ajouter"}
                </Text>
              </Carte>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
