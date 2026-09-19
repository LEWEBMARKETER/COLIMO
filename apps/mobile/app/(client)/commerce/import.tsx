import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  calculatePrice,
  calculerPlanEffectif,
  formatFCFA,
  type Commercant,
  type Zone,
} from "@colimo/shared";
import CarteUpsellPro from "@/components/CarteUpsellPro";
import ZoneSelector from "@/components/ZoneSelector";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import { MODELE_CSV_COMMANDES_MASSE, parserCommandesMasse, type ResultatParsingCommandesMasse } from "@/lib/commandesMasse";
import { creerCourse, getConfirmationLivraison, getMonCommerce, lienSuiviPublic } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { notifierEvenement, notifierMeilleursCoursiers } from "@/lib/communication";

export default function ImportCommandesMasseScreen() {
  const { session, utilisateur } = useAuth();
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [chargementCommerce, setChargementCommerce] = useState(true);

  const [zoneDepart, setZoneDepart] = useState<Zone | null>(utilisateur?.zone ?? null);
  const [adresseDepart, setAdresseDepart] = useState("Adresse du commerce");
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatParsingCommandesMasse | null>(null);
  const [lectureEnCours, setLectureEnCours] = useState(false);
  const [modeleEnCours, setModeleEnCours] = useState(false);

  const [creationEnCours, setCreationEnCours] = useState(false);
  const [progression, setProgression] = useState<{ creees: number; total: number } | null>(null);
  const [echecsCreation, setEchecsCreation] = useState<{ ligne: number; message: string }[]>([]);
  const [termine, setTermine] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMonCommerce(session.user.id)
      .then(setCommerce)
      .finally(() => setChargementCommerce(false));
  }, [session]);

  const planEffectif = commerce ? calculerPlanEffectif(commerce) : "gratuit";

  async function telechargerModele() {
    setModeleEnCours(true);
    try {
      const uri = `${FileSystem.cacheDirectory}colimo-modele-commandes.csv`;
      await FileSystem.writeAsStringAsync(uri, MODELE_CSV_COMMANDES_MASSE, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
      }
    } catch {
      setErreur("Impossible de générer le modèle. Réessayez.");
    } finally {
      setModeleEnCours(false);
    }
  }

  async function choisirFichier() {
    if (!zoneDepart) {
      setErreur("Choisissez d'abord la zone de départ de ce lot.");
      return;
    }
    setErreur(null);
    setResultat(null);
    setTermine(false);
    try {
      const choix = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "text/plain", "application/vnd.ms-excel"],
        copyToCacheDirectory: true,
      });
      if (choix.canceled || !choix.assets[0]) return;
      const fichier = choix.assets[0];
      setLectureEnCours(true);
      setNomFichier(fichier.name);
      const contenu = Platform.OS === "web" ? await (await fetch(fichier.uri)).text() : await FileSystem.readAsStringAsync(fichier.uri);
      setResultat(parserCommandesMasse(contenu, zoneDepart));
    } catch {
      setErreur("Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un fichier CSV.");
    } finally {
      setLectureEnCours(false);
    }
  }

  function recommencer() {
    setNomFichier(null);
    setResultat(null);
    setTermine(false);
    setEchecsCreation([]);
    setProgression(null);
  }

  async function creerLot() {
    if (!resultat || !zoneDepart || !session || resultat.valides.length === 0) return;
    setCreationEnCours(true);
    setErreur(null);
    setEchecsCreation([]);
    setProgression({ creees: 0, total: resultat.valides.length });

    let creees = 0;
    const echecs: { ligne: number; message: string }[] = [];

    for (const ligne of resultat.valides) {
      try {
        const pricing = calculatePrice(zoneDepart, ligne.zoneArrivee, { livraisonPrioritaire: ligne.livraisonPrioritaire });
        const course = await creerCourse({
          clientId: session.user.id,
          adresseDepart,
          nomExpediteur: commerce?.responsable || utilisateur?.nom || undefined,
          telephoneExpediteur: utilisateur?.telephone || undefined,
          adresseArrivee: ligne.adresseArrivee,
          zoneDepart,
          zoneArrivee: ligne.zoneArrivee,
          typeColis: ligne.typeColis,
          categorieColis: "articles",
          livraisonPrioritaire: ligne.livraisonPrioritaire,
          modePaiement: "especes",
          valeurDeclaree: ligne.valeurDeclaree,
          prix: pricing.total,
          nomDestinataire: ligne.nomDestinataire,
          telephoneDestinataire: ligne.telephoneDestinataire,
          instructions: ligne.instructions,
        });

        // Même parité de notifications que la création unitaire
        // (nouvelle-livraison.tsx) — sans quoi les coursiers ne seraient
        // jamais alertés des commandes importées en masse.
        const confirmationLivraison = await getConfirmationLivraison(course.id).catch(() => null);
        await notifierEvenement("livraison_creee", {
          declenchePar: session.user.id,
          destinataire: course.telephoneDestinataire,
          variables: {
            nom_client: course.nomDestinataire ?? "client",
            numero_commande: course.numeroCommande,
            lien_suivi: lienSuiviPublic(course.codeSuivi),
            code_otp: confirmationLivraison?.codeOtp ?? "",
          },
        });
        await notifierMeilleursCoursiers(course, session.user.id);

        creees += 1;
      } catch (e) {
        echecs.push({ ligne: ligne.ligne, message: e instanceof Error ? e.message : "Erreur inconnue" });
      }
      setProgression({ creees: creees + echecs.length, total: resultat.valides.length });
    }

    setEchecsCreation(echecs);
    setTermine(true);
    setCreationEnCours(false);
  }

  if (chargementCommerce) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  if (planEffectif !== "business") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
        <CarteUpsellPro cle="commandes_masse" pleinEcran />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-titre text-xl text-colimo-neutre-fonce">Commandes en masse</Text>
        <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">
          Importez plusieurs livraisons d&apos;un coup depuis un fichier CSV — toutes partent de la même adresse de
          retrait, payées à la livraison (contre-remboursement).
        </Text>

        {termine ? (
          <Carte className="mt-5">
            <Text className="font-titre text-base text-colimo-neutre-fonce">
              {progression ? progression.total - echecsCreation.length : 0} commande
              {(progression?.total ?? 0) - echecsCreation.length > 1 ? "s" : ""} créée
              {(progression?.total ?? 0) - echecsCreation.length > 1 ? "s" : ""}
            </Text>
            {echecsCreation.length > 0 && (
              <View className="mt-2">
                <Text className="font-texte-medium text-xs text-colimo-rouge">
                  {echecsCreation.length} échec{echecsCreation.length > 1 ? "s" : ""} :
                </Text>
                {echecsCreation.map((e) => (
                  <Text key={e.ligne} className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/60">
                    Ligne {e.ligne} — {e.message}
                  </Text>
                ))}
              </View>
            )}
            <Bouton label="Voir mes livraisons" onPress={() => router.push("/(client)/historique")} className="mt-4" />
            <Bouton label="Importer un autre lot" variante="contour" onPress={recommencer} className="mt-2" />
          </Carte>
        ) : (
          <>
            <Carte className="mt-5">
              <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">1. Zone et adresse de retrait</Text>
              <Text className="mb-3 font-texte text-xs text-colimo-neutre-fonce/50">
                La même pour toutes les commandes de ce lot.
              </Text>
              <ZoneSelector label="Zone de départ" value={zoneDepart} onChange={setZoneDepart} />
              <ChampTexte
                label="Adresse de retrait"
                value={adresseDepart}
                onChangeText={setAdresseDepart}
                placeholder="Adresse du commerce"
              />
            </Carte>

            <Carte className="mt-3">
              <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">2. Modèle CSV</Text>
              <Text className="mb-3 font-texte text-xs text-colimo-neutre-fonce/60">
                Colonnes attendues : nom_destinataire, telephone_destinataire, adresse_arrivee, zone_arrivee, type_colis,
                instructions, valeur_declaree, livraison_prioritaire. Copiez ce modèle dans Excel ou Google Sheets,
                remplissez-le puis exportez-le en CSV.
              </Text>
              <Bouton
                label="Télécharger le modèle CSV"
                variante="contour"
                onPress={telechargerModele}
                chargement={modeleEnCours}
              />
            </Carte>

            <Carte className="mt-3">
              <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">3. Importer le fichier rempli</Text>
              <Bouton
                label={nomFichier ?? "Choisir un fichier CSV"}
                variante="contour"
                onPress={choisirFichier}
                chargement={lectureEnCours}
                disabled={!zoneDepart}
              />
              {erreur && <Text className="mt-2 font-texte text-xs text-colimo-rouge">{erreur}</Text>}
            </Carte>

            {resultat && (
              <Carte className="mt-3">
                <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">
                  {resultat.valides.length} commande{resultat.valides.length > 1 ? "s" : ""} valide
                  {resultat.valides.length > 1 ? "s" : ""}
                  {resultat.invalides.length > 0 &&
                    ` · ${resultat.invalides.length} erreur${resultat.invalides.length > 1 ? "s" : ""} à corriger`}
                </Text>

                {resultat.invalides.length > 0 && (
                  <View className="mt-2 gap-1">
                    {resultat.invalides.map((l) => (
                      <Text key={l.ligne} className="font-texte text-xs text-colimo-rouge">
                        Ligne {l.ligne} — {l.erreurs.join(", ")}
                      </Text>
                    ))}
                  </View>
                )}

                {resultat.valides.length > 0 && (
                  <View className="mt-3 gap-1.5 border-t border-colimo-neutre-clair pt-3">
                    {resultat.valides.slice(0, 8).map((l) => (
                      <View key={l.ligne} className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 font-texte text-xs text-colimo-neutre-fonce" numberOfLines={1}>
                          {l.nomDestinataire} — {l.adresseArrivee}
                        </Text>
                        <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                          {formatFCFA(calculatePrice(zoneDepart!, l.zoneArrivee, { livraisonPrioritaire: l.livraisonPrioritaire }).total)}
                        </Text>
                      </View>
                    ))}
                    {resultat.valides.length > 8 && (
                      <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                        + {resultat.valides.length - 8} autre{resultat.valides.length - 8 > 1 ? "s" : ""}
                      </Text>
                    )}
                  </View>
                )}

                {progression && (
                  <Text className="mt-3 font-texte text-xs text-colimo-neutre-fonce/60">
                    Création en cours… {progression.creees} / {progression.total}
                  </Text>
                )}

                <Bouton
                  label={`Créer les ${resultat.valides.length} commande${resultat.valides.length > 1 ? "s" : ""}`}
                  onPress={creerLot}
                  chargement={creationEnCours}
                  disabled={resultat.valides.length === 0}
                  className="mt-3"
                />
              </Carte>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
