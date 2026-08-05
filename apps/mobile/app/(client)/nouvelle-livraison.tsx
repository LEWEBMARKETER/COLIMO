import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  CATEGORIE_COLIS_EMOJIS,
  CATEGORIE_COLIS_LABELS,
  calculatePrice,
  formatFCFA,
  isRouteDesservie,
  type CategorieColis,
  type Zone,
} from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import SelecteurPointCarte from "@/components/SelecteurPointCarte";
import PriceSummary from "@/components/PriceSummary";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { creerCourse, getMonCommerce, initierPaiementManuel } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { notifierEvenement } from "@/lib/communication";

const CATEGORIES = (Object.keys(CATEGORIE_COLIS_LABELS) as CategorieColis[]).map((valeur) => ({
  valeur,
  label: `${CATEGORIE_COLIS_EMOJIS[valeur]} ${CATEGORIE_COLIS_LABELS[valeur]}`,
}));

type TypeLivraison = "standard" | "express" | "programmee";

const TYPES_LIVRAISON: { valeur: TypeLivraison; label: string }[] = [
  { valeur: "standard", label: "Standard" },
  { valeur: "express", label: "Express" },
  { valeur: "programmee", label: "Programmée" },
];

type ModePaiementCommerce = "deja_paye" | "especes" | "mobile_money";

const MODES_PAIEMENT_COMMERCE: { valeur: ModePaiementCommerce; label: string }[] = [
  { valeur: "deja_paye", label: "Déjà payée" },
  { valeur: "especes", label: "Paiement à la livraison (contre-remboursement)" },
  { valeur: "mobile_money", label: "Payer les frais de livraison par Airtel Money" },
];

function TitreSection({ children }: { children: string }) {
  return (
    <Text className="mb-3 mt-6 font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
      {children}
    </Text>
  );
}

export default function NouvelleLivraisonScreen() {
  const { session, utilisateur } = useAuth();
  const [depart, setDepart] = useState<Zone | null>(utilisateur?.zone ?? null);
  const [adresseCommerce, setAdresseCommerce] = useState("Adresse du commerce");
  const [arrivee, setArrivee] = useState<Zone | null>(null);
  const [adresseArrivee, setAdresseArrivee] = useState("");
  const [repereArrivee, setRepereArrivee] = useState("");
  const [coordArrivee, setCoordArrivee] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nomDestinataire, setNomDestinataire] = useState("");
  const [telephoneDestinataire, setTelephoneDestinataire] = useState("");
  const [natureCommande, setNatureCommande] = useState("");
  const [montant, setMontant] = useState("");
  const [poidsEstime, setPoidsEstime] = useState("");
  const [typeLivraison, setTypeLivraison] = useState<TypeLivraison>("standard");
  const [datePreference, setDatePreference] = useState("");
  const [modePaiement, setModePaiement] = useState<ModePaiementCommerce>("especes");
  const [instructions, setInstructions] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMonCommerce(session.user.id).then((commercant) => {
      if (commercant?.adresse) setAdresseCommerce(commercant.adresse);
    });
  }, [session]);

  const categorieColis: CategorieColis = "articles";

  const pricing = useMemo(() => {
    if (!depart || !arrivee || !isRouteDesservie(depart, arrivee)) return null;
    return calculatePrice(depart, arrivee, { livraisonPrioritaire: typeLivraison === "express" });
  }, [depart, arrivee, typeLivraison]);

  const peutPublier = Boolean(
    pricing && telephoneDestinataire.trim() && adresseArrivee.trim() && natureCommande.trim() && !envoiEnCours
  );

  async function handlePublier() {
    if (!depart || !arrivee || !pricing || !session) return;

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
        typeColis: natureCommande,
        categorieColis,
        livraisonPrioritaire: typeLivraison === "express",
        modePaiement,
        valeurDeclaree: Number(montant) || undefined,
        prix: pricing.total,
        nomDestinataire: nomDestinataire.trim() || undefined,
        telephoneDestinataire: telephoneDestinataire.trim(),
        repereArrivee: repereArrivee.trim() || undefined,
        poidsEstime: Number(poidsEstime) || undefined,
        instructions: instructions.trim() || undefined,
        programmeePour,
      });
      await notifierEvenement("livraison_creee", {
        declenchePar: session.user.id,
        destinataire: course.telephoneDestinataire,
        variables: {
          nom_client: course.nomDestinataire ?? "client",
          numero_commande: course.numeroCommande,
        },
      });
      await notifierEvenement("notification_livraison_creee", {
        declenchePar: session.user.id,
        destinataire: session.user.id,
        utilisateurId: session.user.id,
        variables: { numero_commande: course.numeroCommande },
      });
      if (modePaiement === "mobile_money") {
        await initierPaiementManuel({ courseId: course.id, utilisateurId: session.user.id, montantAttendu: course.prix });
      }
      router.push(`/(client)/track/${course.id}`);
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : null;
      setErreur(
        message ? `Impossible de publier la livraison : ${message}` : "Impossible de publier la livraison. Réessayez."
      );
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="font-titre text-lg text-colimo-neutre-fonce">Nouvelle livraison</Text>
        <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/50">Départ : {adresseCommerce}</Text>

        <TitreSection>Renseignement client</TitreSection>
        <ChampTexte label="Nom" value={nomDestinataire} onChangeText={setNomDestinataire} placeholder="Nom du client" />
        <ChampTexte
          label="Téléphone"
          value={telephoneDestinataire}
          onChangeText={setTelephoneDestinataire}
          keyboardType="phone-pad"
          placeholder="+241 XX XXX XXX"
        />
        <ZoneSelector label="Quartier" value={arrivee} onChange={setArrivee} />
        <ChampTexte
          label="Adresse"
          value={adresseArrivee}
          onChangeText={setAdresseArrivee}
          placeholder="Adresse précise de livraison"
        />
        <ChampTexte
          label="Repère (optionnel)"
          value={repereArrivee}
          onChangeText={setRepereArrivee}
          placeholder="Ex : Immeuble bleu en face de la pharmacie"
        />
        <SelecteurPointCarte
          id="arrivee"
          coordonnees={coordArrivee}
          onChangerCoordonnees={setCoordArrivee}
          adresseRecherche={adresseArrivee}
          zone={arrivee}
          couleur="#2563EB"
        />

        <TitreSection>Informations de la commande</TitreSection>
        <ChampTexte
          label="Nature de la commande"
          value={natureCommande}
          onChangeText={setNatureCommande}
          placeholder="Ex : Commande n°42, 2 plats"
        />
        <ChampTexte
          label="Poids estimé (kg, optionnel)"
          value={poidsEstime}
          onChangeText={setPoidsEstime}
          keyboardType="numeric"
          placeholder="0"
        />

        <TitreSection>Montant</TitreSection>
        <ChampTexte
          label="Valeur de la commande (FCFA)"
          value={montant}
          onChangeText={setMontant}
          keyboardType="numeric"
          placeholder="0"
        />
        {Number(montant) > 0 && (
          <Carte sombre className="mb-4 -mt-2">
            <Text className="font-texte text-xs text-white/60">Valeur de la commande</Text>
            <Text className="mt-1 font-titre text-white">{formatFCFA(Number(montant))}</Text>
          </Carte>
        )}
        <GroupePastilles
          label="Statut du paiement"
          options={MODES_PAIEMENT_COMMERCE}
          value={modePaiement}
          onChange={setModePaiement}
        />

        <TitreSection>Livraison</TitreSection>
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

        <TitreSection>Instructions</TitreSection>
        <ChampTexte
          label="Instructions pour le coursier (optionnel)"
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={3}
          placeholder="Ex : Le client préfère être appelé avant l'arrivée. Le colis est fragile."
          style={{ minHeight: 72, textAlignVertical: "top" }}
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
          label="Demander un coursier"
          onPress={handlePublier}
          disabled={!peutPublier}
          chargement={envoiEnCours}
          className="mb-8"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
