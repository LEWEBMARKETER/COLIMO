import { useMemo, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  CATEGORIE_COLIS_LABELS,
  MODE_PAIEMENT_LABELS,
  calculatePrice,
  isRouteDesservie,
  type CategorieColis,
  type ModePaiement,
  type Zone,
} from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import PriceSummary from "@/components/PriceSummary";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { creerCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = (Object.keys(CATEGORIE_COLIS_LABELS) as CategorieColis[]).map((valeur) => ({
  valeur,
  label: CATEGORIE_COLIS_LABELS[valeur],
}));
const MODES_PAIEMENT = Object.keys(MODE_PAIEMENT_LABELS) as ModePaiement[];

export default function PublishScreen() {
  const { session } = useAuth();
  const [depart, setDepart] = useState<Zone | null>(null);
  const [arrivee, setArrivee] = useState<Zone | null>(null);
  const [adresseDepart, setAdresseDepart] = useState("");
  const [adresseArrivee, setAdresseArrivee] = useState("");
  const [categorieColis, setCategorieColis] = useState<CategorieColis | null>(null);
  const [description, setDescription] = useState("");
  const [modePaiement, setModePaiement] = useState<ModePaiement>("especes");
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
    pricing && categorieColis && adresseDepart.trim() && adresseArrivee.trim() && !envoiEnCours
  );

  async function handlePublier() {
    if (!depart || !arrivee || !pricing || !session || !categorieColis) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const course = await creerCourse({
        clientId: session.user.id,
        adresseDepart,
        adresseArrivee,
        zoneDepart: depart,
        zoneArrivee: arrivee,
        typeColis: description,
        categorieColis,
        livraisonPrioritaire: prioritaire,
        modePaiement,
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
        <ChampTexte
          label="Adresse de départ"
          icone="radio-button-on-outline"
          value={adresseDepart}
          onChangeText={setAdresseDepart}
          placeholder="Adresse précise de départ"
        />

        <ZoneSelector label="Arrivée" value={arrivee} onChange={setArrivee} />
        <ChampTexte
          label="Adresse d'arrivée"
          icone="location-outline"
          value={adresseArrivee}
          onChangeText={setAdresseArrivee}
          placeholder="Adresse précise d'arrivée"
        />

        <GroupePastilles label="Type de colis" options={CATEGORIES} value={categorieColis} onChange={setCategorieColis} />

        <ChampTexte
          label="Description du colis"
          value={description}
          onChangeText={setDescription}
          placeholder="Ex : 2 plats + 1 boisson, colis fragile..."
        />

        <ChampTexte
          label="Valeur déclarée (FCFA, optionnel)"
          value={valeurDeclaree}
          onChangeText={setValeurDeclaree}
          keyboardType="numeric"
          placeholder="0"
        />

        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3">
          <Text className="font-texte text-colimo-neutre-fonce">Livraison prioritaire (+1 000 FCFA)</Text>
          <Switch value={prioritaire} onValueChange={setPrioritaire} />
        </View>

        <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">Mode de paiement</Text>
        <View className="mb-4 flex-row gap-2">
          {MODES_PAIEMENT.map((mode) => (
            <Bouton
              key={mode}
              label={MODE_PAIEMENT_LABELS[mode]}
              variante={modePaiement === mode ? "primaire" : "contour"}
              onPress={() => setModePaiement(mode)}
              className="flex-1 py-3"
            />
          ))}
        </View>

        {depart && arrivee && !pricing && (
          <Text className="mb-4 font-texte text-sm text-colimo-rouge">
            Cette route n&apos;est pas encore desservie.
          </Text>
        )}

        {pricing && (
          <View className="mb-6">
            <PriceSummary pricing={pricing} />
          </View>
        )}

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton
          label="Publier la course"
          onPress={handlePublier}
          disabled={!peutPublier}
          chargement={envoiEnCours}
          className="mb-8"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
