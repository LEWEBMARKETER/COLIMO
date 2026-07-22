import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { calculatePrice, isRouteDesservie, type Zone } from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import PriceSummary from "@/components/PriceSummary";
import { creerCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function PublishScreen() {
  const { session } = useAuth();
  const [depart, setDepart] = useState<Zone | null>(null);
  const [arrivee, setArrivee] = useState<Zone | null>(null);
  const [adresseDepart, setAdresseDepart] = useState("");
  const [adresseArrivee, setAdresseArrivee] = useState("");
  const [typeColis, setTypeColis] = useState("");
  const [prioritaire, setPrioritaire] = useState(false);
  const [valeurDeclaree, setValeurDeclaree] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const pricing = useMemo(() => {
    if (!depart || !arrivee || !isRouteDesservie(depart, arrivee)) return null;
    return calculatePrice(depart, arrivee, {
      livraisonPrioritaire: prioritaire,
      valeurDeclaree: Number(valeurDeclaree) || undefined,
    });
  }, [depart, arrivee, prioritaire, valeurDeclaree]);

  const peutPublier = Boolean(
    pricing && typeColis.trim() && adresseDepart.trim() && adresseArrivee.trim() && !envoiEnCours
  );

  async function handlePublier() {
    if (!depart || !arrivee || !pricing || !session) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const course = await creerCourse({
        clientId: session.user.id,
        adresseDepart,
        adresseArrivee,
        zoneDepart: depart,
        zoneArrivee: arrivee,
        typeColis,
        livraisonPrioritaire: prioritaire,
        valeurDeclaree: Number(valeurDeclaree) || undefined,
        prix: pricing.total,
      });
      router.push(`/(client)/track/${course.id}`);
    } catch {
      setErreur("Impossible de publier la course. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <ZoneSelector label="Départ" value={depart} onChange={setDepart} />
        <TextInput
          value={adresseDepart}
          onChangeText={setAdresseDepart}
          placeholder="Adresse précise de départ"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <ZoneSelector label="Arrivée" value={arrivee} onChange={setArrivee} />
        <TextInput
          value={adresseArrivee}
          onChangeText={setAdresseArrivee}
          placeholder="Adresse précise d'arrivée"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Type de colis</Text>
        <TextInput
          value={typeColis}
          onChangeText={setTypeColis}
          placeholder="Documents, colis moyen, colis fragile..."
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">
          Valeur déclarée (FCFA, optionnel)
        </Text>
        <TextInput
          value={valeurDeclaree}
          onChangeText={setValeurDeclaree}
          keyboardType="numeric"
          placeholder="0"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3">
          <Text className="text-colimo-neutre-fonce">Livraison prioritaire (+1 000 FCFA)</Text>
          <Switch value={prioritaire} onValueChange={setPrioritaire} />
        </View>

        {depart && arrivee && !pricing && (
          <Text className="mb-4 text-sm text-colimo-rouge">
            Cette route n&apos;est pas encore desservie.
          </Text>
        )}

        {pricing && (
          <View className="mb-6">
            <PriceSummary pricing={pricing} />
          </View>
        )}

        {erreur && <Text className="mb-4 text-sm text-colimo-rouge">{erreur}</Text>}

        <Pressable
          disabled={!peutPublier}
          onPress={handlePublier}
          className={`mb-8 flex-row items-center justify-center rounded-xl py-4 ${
            peutPublier ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"
          }`}
        >
          {envoiEnCours && <ActivityIndicator color="white" className="mr-2" />}
          <Text
            className={`text-center font-semibold ${peutPublier ? "text-white" : "text-colimo-neutre-fonce/50"}`}
          >
            Publier la course
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
