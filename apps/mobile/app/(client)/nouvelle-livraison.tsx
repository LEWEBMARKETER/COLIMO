import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  CATEGORIE_COLIS_LABELS,
  calculatePrice,
  isRouteDesservie,
  type CategorieColis,
  type Zone,
} from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import BoutonPosition from "@/components/BoutonPosition";
import PriceSummary from "@/components/PriceSummary";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { creerCourse, getMonCommerce } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = (Object.keys(CATEGORIE_COLIS_LABELS) as CategorieColis[]).map((valeur) => ({
  valeur,
  label: CATEGORIE_COLIS_LABELS[valeur],
}));

type TypeLivraison = "standard" | "express" | "programmee";

const TYPES_LIVRAISON: { valeur: TypeLivraison; label: string }[] = [
  { valeur: "standard", label: "Standard" },
  { valeur: "express", label: "Express (urgente)" },
  { valeur: "programmee", label: "Programmée" },
];

type ModePaiementCommerce = "deja_paye" | "especes";

const MODES_PAIEMENT_COMMERCE: { valeur: ModePaiementCommerce; label: string }[] = [
  { valeur: "deja_paye", label: "Déjà payé" },
  { valeur: "especes", label: "Paiement à la livraison" },
];

export default function NouvelleLivraisonScreen() {
  const { session, utilisateur } = useAuth();
  const [depart, setDepart] = useState<Zone | null>(utilisateur?.zone ?? null);
  const [adresseCommerce, setAdresseCommerce] = useState("Adresse du commerce");
  const [arrivee, setArrivee] = useState<Zone | null>(null);
  const [adresseArrivee, setAdresseArrivee] = useState("");
  const [coordArrivee, setCoordArrivee] = useState<{ latitude: number; longitude: number } | null>(null);
  const [telephoneDestinataire, setTelephoneDestinataire] = useState("");
  const [categorieColis, setCategorieColis] = useState<CategorieColis | null>(null);
  const [description, setDescription] = useState("");
  const [valeurDeclaree, setValeurDeclaree] = useState("");
  const [poidsEstime, setPoidsEstime] = useState("");
  const [typeLivraison, setTypeLivraison] = useState<TypeLivraison>("standard");
  const [datePreference, setDatePreference] = useState("");
  const [modePaiement, setModePaiement] = useState<ModePaiementCommerce>("especes");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMonCommerce(session.user.id).then((commercant) => {
      if (commercant?.adresse) setAdresseCommerce(commercant.adresse);
    });
  }, [session]);

  const pricing = useMemo(() => {
    if (!depart || !arrivee || !isRouteDesservie(depart, arrivee)) return null;
    return calculatePrice(depart, arrivee, {
      livraisonPrioritaire: typeLivraison === "express",
      valeurDeclaree: Number(valeurDeclaree) || undefined,
    });
  }, [depart, arrivee, typeLivraison, valeurDeclaree]);

  const peutPublier = Boolean(
    pricing &&
      categorieColis &&
      telephoneDestinataire.trim() &&
      adresseArrivee.trim() &&
      !envoiEnCours
  );

  async function handlePublier() {
    if (!depart || !arrivee || !pricing || !session || !categorieColis) return;

    let programmeePour: string | undefined;
    if (typeLivraison === "programmee") {
      const date = new Date(datePreference);
      if (Number.isNaN(date.getTime())) {
        setErreur("Format de date invalide. Exemple : 2026-08-01 14:30");
        return;
      }
      programmeePour = date.toISOString();
    }

    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const course = await creerCourse({
        clientId: session.user.id,
        adresseDepart: adresseCommerce,
        adresseArrivee,
        latitudeArrivee: coordArrivee?.latitude,
        longitudeArrivee: coordArrivee?.longitude,
        zoneDepart: depart,
        zoneArrivee: arrivee,
        typeColis: description,
        categorieColis,
        livraisonPrioritaire: typeLivraison === "express",
        modePaiement,
        valeurDeclaree: Number(valeurDeclaree) || undefined,
        prix: pricing.total,
        telephoneDestinataire: telephoneDestinataire.trim(),
        poidsEstime: Number(poidsEstime) || undefined,
        programmeePour,
      });
      router.push(`/(client)/track/${course.id}`);
    } catch {
      setErreur("Impossible de publier la livraison. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="mb-1 font-titre text-lg text-colimo-neutre-fonce">Nouvelle livraison</Text>

        <Text className="mb-2 mt-4 font-texte-medium text-sm text-colimo-neutre-fonce">Informations du client</Text>
        <ChampTexte
          label="Téléphone"
          value={telephoneDestinataire}
          onChangeText={setTelephoneDestinataire}
          keyboardType="phone-pad"
          placeholder="+241 XX XXX XXX"
        />
        <ZoneSelector label="Quartier" value={arrivee} onChange={setArrivee} />
        <ChampTexte
          label="Adresse précise / repère"
          value={adresseArrivee}
          onChangeText={setAdresseArrivee}
          placeholder="Ex : Immeuble bleu en face de la pharmacie"
        />
        <BoutonPosition
          label={coordArrivee ? "Position enregistrée ✓" : "Utiliser la position du client"}
          onLocalisation={(latitude, longitude) => setCoordArrivee({ latitude, longitude })}
        />

        <Text className="mb-2 mt-4 font-texte-medium text-sm text-colimo-neutre-fonce">Informations du colis</Text>
        <GroupePastilles label="Type de colis" options={CATEGORIES} value={categorieColis} onChange={setCategorieColis} />
        <ChampTexte
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Ex : Commande n°42, 2 plats"
        />
        <ChampTexte
          label="Valeur déclarée (FCFA, optionnel)"
          value={valeurDeclaree}
          onChangeText={setValeurDeclaree}
          keyboardType="numeric"
          placeholder="0"
        />
        <ChampTexte
          label="Poids estimé (kg, optionnel)"
          value={poidsEstime}
          onChangeText={setPoidsEstime}
          keyboardType="numeric"
          placeholder="0"
        />

        <Text className="mb-2 mt-4 font-texte-medium text-sm text-colimo-neutre-fonce">Livraison</Text>
        <ZoneSelector label="Zone de départ (votre commerce)" value={depart} onChange={setDepart} />
        <GroupePastilles
          label="Type de livraison"
          options={TYPES_LIVRAISON}
          value={typeLivraison}
          onChange={setTypeLivraison}
        />
        {typeLivraison === "programmee" && (
          <ChampTexte
            label="Date et heure souhaitées"
            value={datePreference}
            onChangeText={setDatePreference}
            placeholder="Ex : 2026-08-01 14:30"
          />
        )}

        <Text className="mb-2 mt-4 font-texte-medium text-sm text-colimo-neutre-fonce">Paiement</Text>
        <GroupePastilles
          label="Mode de paiement"
          options={MODES_PAIEMENT_COMMERCE}
          value={modePaiement}
          onChange={setModePaiement}
        />

        {depart && arrivee && !pricing && (
          <Text className="mb-4 mt-2 font-texte text-sm text-colimo-rouge">
            Cette route n&apos;est pas encore desservie.
          </Text>
        )}

        {pricing && (
          <View className="mt-4 mb-6">
            <PriceSummary pricing={pricing} />
          </View>
        )}

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton
          label="Publier la livraison"
          onPress={handlePublier}
          disabled={!peutPublier}
          chargement={envoiEnCours}
          className="mb-8"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
