import { useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { calculatePrice, isRouteDesservie, type Zone } from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import PriceSummary from "@/components/PriceSummary";

export default function PublishScreen() {
  const [depart, setDepart] = useState<Zone | null>(null);
  const [arrivee, setArrivee] = useState<Zone | null>(null);
  const [typeColis, setTypeColis] = useState("");
  const [prioritaire, setPrioritaire] = useState(false);
  const [valeurDeclaree, setValeurDeclaree] = useState("");

  const pricing = useMemo(() => {
    if (!depart || !arrivee || !isRouteDesservie(depart, arrivee)) return null;
    return calculatePrice(depart, arrivee, {
      livraisonPrioritaire: prioritaire,
      valeurDeclaree: Number(valeurDeclaree) || undefined,
    });
  }, [depart, arrivee, prioritaire, valeurDeclaree]);

  const peutPublier = Boolean(pricing && typeColis.trim());

  // TODO: enregistrer la course via Supabase puis notifier les coursiers de la zone.
  function handlePublier() {
    router.push("/(client)/track/d1");
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <ZoneSelector label="Départ" value={depart} onChange={setDepart} />
        <ZoneSelector label="Arrivée" value={arrivee} onChange={setArrivee} />

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

        <Pressable
          disabled={!peutPublier}
          onPress={handlePublier}
          className={`mb-8 rounded-xl py-4 ${peutPublier ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"}`}
        >
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
