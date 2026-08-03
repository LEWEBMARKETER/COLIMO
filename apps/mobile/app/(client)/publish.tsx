import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  CATEGORIE_COLIS_EMOJIS,
  CATEGORIE_COLIS_LABELS,
  QUI_PAIE_LABELS,
  TAILLE_COLIS_LABELS,
  calculatePrice,
  calculerReductionPromo,
  codePromoValide,
  distanceKm,
  formatFCFA,
  isRouteDesservie,
  tempsEstimeMinutes,
  type CategorieColis,
  type CodePromo,
  type ModePaiement,
  type QuiPaie,
  type TailleColis,
  type Zone,
} from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import SelecteurPointCarte from "@/components/SelecteurPointCarte";
import PriceSummary from "@/components/PriceSummary";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import Stepper from "@/components/ui/Stepper";
import { creerCourse, getCodePromoParCode } from "@/lib/api";
import { notifierEvenement } from "@/lib/notifications";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = (Object.keys(CATEGORIE_COLIS_LABELS) as CategorieColis[]).map((valeur) => ({
  valeur,
  label: `${CATEGORIE_COLIS_EMOJIS[valeur]} ${CATEGORIE_COLIS_LABELS[valeur]}`,
}));
const TAILLES = (Object.keys(TAILLE_COLIS_LABELS) as TailleColis[]).map((valeur) => ({
  valeur,
  label: TAILLE_COLIS_LABELS[valeur],
}));
const QUI_PAIE_OPTIONS = (Object.keys(QUI_PAIE_LABELS) as QuiPaie[]).map((valeur) => ({
  valeur,
  label: QUI_PAIE_LABELS[valeur],
}));
const MODES_PAIEMENT: { valeur: ModePaiement; label: string }[] = [
  { valeur: "especes", label: "Espèces" },
  { valeur: "mobile_money", label: "Mobile Money" },
];

type TypeLivraison = "standard" | "express" | "programmee";

const TYPES_LIVRAISON: { valeur: TypeLivraison; label: string }[] = [
  { valeur: "standard", label: "Standard" },
  { valeur: "express", label: "Express (prioritaire)" },
  { valeur: "programmee", label: "Programmée" },
];

const ETAPES = ["Récupération", "Livraison", "Colis", "Options", "Paiement", "Confirmation"];

export default function PublishScreen() {
  const { session, utilisateur } = useAuth();
  const [etape, setEtape] = useState(0);

  // Étape 1 — récupération
  const [depart, setDepart] = useState<Zone | null>(utilisateur?.zone ?? null);
  const [adresseDepart, setAdresseDepart] = useState("");
  const [repereDepart, setRepereDepart] = useState("");
  const [coordDepart, setCoordDepart] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nomExpediteur, setNomExpediteur] = useState(utilisateur?.prenom ?? utilisateur?.nom ?? "");
  const [telephoneExpediteur, setTelephoneExpediteur] = useState(utilisateur?.telephone ?? "");

  // Étape 2 — livraison
  const [arrivee, setArrivee] = useState<Zone | null>(null);
  const [adresseArrivee, setAdresseArrivee] = useState("");
  const [repereArrivee, setRepereArrivee] = useState("");
  const [coordArrivee, setCoordArrivee] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nomDestinataire, setNomDestinataire] = useState("");
  const [telephoneDestinataire, setTelephoneDestinataire] = useState("");

  // Étape 3 — colis
  const [categorieColis, setCategorieColis] = useState<CategorieColis | null>(null);
  const [description, setDescription] = useState("");
  const [valeurDeclaree, setValeurDeclaree] = useState("");
  const [tailleColis, setTailleColis] = useState<TailleColis | null>(null);

  // Étape 4 — options
  const [typeLivraison, setTypeLivraison] = useState<TypeLivraison>("standard");
  const [datePreference, setDatePreference] = useState("");

  // Étape 5 — paiement
  const [quiPaie, setQuiPaie] = useState<QuiPaie>("expediteur");
  const [modePaiement, setModePaiement] = useState<ModePaiement>("especes");
  const [codePromoTexte, setCodePromoTexte] = useState("");
  const [codePromoApplique, setCodePromoApplique] = useState<CodePromo | null>(null);
  const [verificationPromoEnCours, setVerificationPromoEnCours] = useState(false);
  const [erreurPromo, setErreurPromo] = useState<string | null>(null);

  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const pricing = useMemo(() => {
    if (!depart || !arrivee || !isRouteDesservie(depart, arrivee)) return null;
    return calculatePrice(depart, arrivee, {
      livraisonPrioritaire: typeLivraison === "express",
      valeurDeclaree: Number(valeurDeclaree) || undefined,
    });
  }, [depart, arrivee, typeLivraison, valeurDeclaree]);

  const reduction = pricing && codePromoApplique ? calculerReductionPromo(pricing.total, codePromoApplique) : 0;

  const distance = coordDepart && coordArrivee ? distanceKm(coordDepart, coordArrivee) : null;
  const tempsEstime = distance !== null ? tempsEstimeMinutes(distance) : null;

  async function appliquerCodePromo() {
    if (!codePromoTexte.trim()) return;
    setVerificationPromoEnCours(true);
    setErreurPromo(null);
    try {
      const promo = await getCodePromoParCode(codePromoTexte.trim());
      if (!promo || !codePromoValide(promo)) {
        setErreurPromo("Code promo invalide ou expiré.");
        setCodePromoApplique(null);
        return;
      }
      setCodePromoApplique(promo);
    } catch {
      setErreurPromo("Impossible de vérifier ce code. Réessayez.");
    } finally {
      setVerificationPromoEnCours(false);
    }
  }

  const validationParEtape: boolean[] = [
    Boolean(depart && adresseDepart.trim() && telephoneExpediteur.trim()),
    Boolean(arrivee && adresseArrivee.trim() && telephoneDestinataire.trim()),
    Boolean(categorieColis),
    typeLivraison !== "programmee" || Boolean(datePreference.trim()),
    true,
    true,
  ];

  function suivant() {
    if (!validationParEtape[etape]) return;
    setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  }

  function precedent() {
    setEtape((e) => Math.max(e - 1, 0));
  }

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
        adresseDepart,
        adresseArrivee,
        latitudeDepart: coordDepart?.latitude,
        longitudeDepart: coordDepart?.longitude,
        latitudeArrivee: coordArrivee?.latitude,
        longitudeArrivee: coordArrivee?.longitude,
        zoneDepart: depart,
        zoneArrivee: arrivee,
        typeColis: description,
        categorieColis,
        livraisonPrioritaire: typeLivraison === "express",
        modePaiement,
        valeurDeclaree: Number(valeurDeclaree) || undefined,
        prix: Math.max(pricing.total - reduction, 0),
        codePromoId: codePromoApplique?.id,
        reductionPromo: reduction,
        nomExpediteur: nomExpediteur.trim() || undefined,
        telephoneExpediteur: telephoneExpediteur.trim() || undefined,
        nomDestinataire: nomDestinataire.trim() || undefined,
        telephoneDestinataire: telephoneDestinataire.trim() || undefined,
        repereDepart: repereDepart.trim() || undefined,
        repereArrivee: repereArrivee.trim() || undefined,
        tailleColis: tailleColis ?? undefined,
        quiPaie,
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
      router.push(`/(client)/track/${course.id}`);
    } catch {
      setErreur("Impossible de publier la course. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="px-6 pt-4">
        <Stepper etapes={ETAPES} etapeActuelle={etape} />
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {etape === 0 && (
          <>
            <ChampTexte
              label="Adresse de récupération"
              icone="radio-button-on-outline"
              value={adresseDepart}
              onChangeText={setAdresseDepart}
              placeholder="Adresse précise de départ"
            />
            <ZoneSelector label="Ville ou zone" value={depart} onChange={setDepart} />
            <ChampTexte
              label="Repère (optionnel)"
              value={repereDepart}
              onChangeText={setRepereDepart}
              placeholder='Ex : "Maison jaune derrière la pharmacie"'
            />
            <SelecteurPointCarte
              id="depart"
              coordonnees={coordDepart}
              onChangerCoordonnees={setCoordDepart}
              adresseRecherche={adresseDepart}
              zone={depart}
              couleur="#C41E24"
            />
            <ChampTexte
              label="Nom du contact"
              value={nomExpediteur}
              onChangeText={setNomExpediteur}
              placeholder="Personne à contacter pour la récupération"
            />
            <ChampTexte
              label="Téléphone du contact"
              value={telephoneExpediteur}
              onChangeText={setTelephoneExpediteur}
              keyboardType="phone-pad"
              placeholder="+241 XX XXX XXX"
            />
          </>
        )}

        {etape === 1 && (
          <>
            <ChampTexte
              label="Adresse de livraison"
              icone="location-outline"
              value={adresseArrivee}
              onChangeText={setAdresseArrivee}
              placeholder="Adresse précise d'arrivée"
            />
            <ZoneSelector label="Ville ou zone" value={arrivee} onChange={setArrivee} />
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
              pointContexte={coordDepart ? { coordonnees: coordDepart, couleur: "#C41E24", label: "Départ" } : null}
            />
            <ChampTexte
              label="Nom du destinataire"
              value={nomDestinataire}
              onChangeText={setNomDestinataire}
              placeholder="Personne qui recevra le colis"
            />
            <ChampTexte
              label="Téléphone du destinataire"
              value={telephoneDestinataire}
              onChangeText={setTelephoneDestinataire}
              keyboardType="phone-pad"
              placeholder="+241 XX XXX XXX"
            />
          </>
        )}

        {etape === 2 && (
          <>
            <GroupePastilles label="Type de colis" options={CATEGORIES} value={categorieColis} onChange={setCategorieColis} />
            <ChampTexte
              label="Description (optionnelle)"
              value={description}
              onChangeText={setDescription}
              placeholder="Ex : 2 plats + 1 boisson, colis fragile..."
            />
            <ChampTexte
              label="Valeur déclarée (FCFA, optionnelle)"
              value={valeurDeclaree}
              onChangeText={setValeurDeclaree}
              keyboardType="numeric"
              placeholder="0"
            />
            <GroupePastilles label="Taille" options={TAILLES} value={tailleColis} onChange={setTailleColis} />
          </>
        )}

        {etape === 3 && (
          <>
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
            {typeLivraison === "express" && (
              <Text className="-mt-2 mb-4 font-texte text-xs text-colimo-neutre-fonce/50">
                +{formatFCFA(1000)} pour une prise en charge prioritaire.
              </Text>
            )}
          </>
        )}

        {etape === 4 && (
          <>
            <GroupePastilles label="Qui paie la livraison ?" options={QUI_PAIE_OPTIONS} value={quiPaie} onChange={setQuiPaie} />
            <GroupePastilles label="Mode de paiement" options={MODES_PAIEMENT} value={modePaiement} onChange={setModePaiement} />

            <View className="mb-2 mt-2 flex-row items-end gap-2">
              <ChampTexte
                label="Code promo (optionnel)"
                value={codePromoTexte}
                onChangeText={(t) => {
                  setCodePromoTexte(t.toUpperCase());
                  setCodePromoApplique(null);
                  setErreurPromo(null);
                }}
                autoCapitalize="characters"
                placeholder="Ex : BIENVENUE10"
                className="mb-0 flex-1"
              />
              <Bouton
                label={codePromoApplique ? "Appliqué ✓" : "Appliquer"}
                variante="contour"
                onPress={appliquerCodePromo}
                disabled={!codePromoTexte.trim() || verificationPromoEnCours}
                chargement={verificationPromoEnCours}
                className="px-4 py-3"
              />
            </View>
            {erreurPromo && <Text className="mb-4 -mt-2 font-texte text-xs text-colimo-rouge">{erreurPromo}</Text>}
          </>
        )}

        {etape === 5 && (
          <>
            {!pricing && (
              <Text className="mb-4 font-texte text-sm text-colimo-rouge">
                Cette route n&apos;est pas encore desservie.
              </Text>
            )}

            {pricing && (
              <Carte sombre className="mb-4">
                <Text className="font-texte-medium text-white">
                  {adresseDepart || "Départ"} → {adresseArrivee || "Arrivée"}
                </Text>
                <View className="mt-3 flex-row justify-between">
                  <Text className="font-texte text-sm text-white/60">Distance</Text>
                  <Text className="font-texte text-sm text-white">
                    {distance !== null ? `${distance.toFixed(1)} km` : "Non disponible"}
                  </Text>
                </View>
                <View className="mt-1 flex-row justify-between">
                  <Text className="font-texte text-sm text-white/60">Temps estimé</Text>
                  <Text className="font-texte text-sm text-white">
                    {tempsEstime !== null ? `${tempsEstime} min` : "Non disponible"}
                  </Text>
                </View>
                <View className="mt-1 flex-row justify-between">
                  <Text className="font-texte text-sm text-white/60">Qui paie</Text>
                  <Text className="font-texte text-sm text-white">{QUI_PAIE_LABELS[quiPaie]}</Text>
                </View>
              </Carte>
            )}

            {pricing && (
              <View className="mb-6">
                <PriceSummary pricing={pricing} reduction={reduction} />
              </View>
            )}
          </>
        )}

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <View className="mt-2 flex-row gap-3">
          {etape > 0 && (
            <Bouton label="Retour" variante="contour" onPress={precedent} className="flex-1" />
          )}
          {etape < ETAPES.length - 1 ? (
            <Bouton
              label="Suivant"
              onPress={suivant}
              disabled={!validationParEtape[etape]}
              className="flex-1"
            />
          ) : (
            <Bouton
              label="Commander"
              onPress={handlePublier}
              disabled={!pricing || envoiEnCours}
              chargement={envoiEnCours}
              className="flex-1"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
