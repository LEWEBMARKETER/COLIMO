import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { SlideInLeft, SlideInRight } from "react-native-reanimated";
import { router } from "expo-router";
import {
  JUSTIFICATIFS_COMPLEMENTAIRES_PAR_CATEGORIE,
  PIECE_IDENTITE_LABELS,
  TYPE_VEHICULE_TRANSPORT_LABELS,
  ZONE_LABELS,
  type PieceIdentiteType,
  type TypeVehiculeTransport,
  type Zone,
} from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import PhotoPicker from "@/components/PhotoPicker";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import Stepper from "@/components/ui/Stepper";
import { inscrireTransporteur } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";

const PIECES_IDENTITE = (Object.keys(PIECE_IDENTITE_LABELS) as PieceIdentiteType[]).map((valeur) => ({
  valeur,
  label: PIECE_IDENTITE_LABELS[valeur],
}));

const TYPES_VEHICULE = (Object.keys(TYPE_VEHICULE_TRANSPORT_LABELS) as TypeVehiculeTransport[]).map((valeur) => ({
  valeur,
  label: TYPE_VEHICULE_TRANSPORT_LABELS[valeur],
}));

const ETAPES = ["Informations", "Véhicule", "Documents"];

type Photo = { uri: string; mimeType: string };

// Inscription transporteur (COLIMO TRANSPORT) — parcours réduit à 3
// étapes (besoin métier de simplification) : infos personnelles, véhicule
// (le premier de la flotte — d'autres peuvent être ajoutés ensuite,
// "Mes véhicules"), documents + acceptation des conditions de
// partenariat. Même stepper que publish.tsx (Stepper + Animated.View).
export default function RegisterTransporteurScreen() {
  const [etape, setEtape] = useState(0);
  const [direction, setDirection] = useState<"avant" | "arriere">("avant");

  // Étape 0 — informations personnelles
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [quartier, setQuartier] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  // Étape 1 — véhicule
  const [typeVehicule, setTypeVehicule] = useState<TypeVehiculeTransport | null>(null);
  const [plaque, setPlaque] = useState("");
  const [capacitePoids, setCapacitePoids] = useState("");
  const [capaciteVolume, setCapaciteVolume] = useState("");
  const [photoVehicule, setPhotoVehicule] = useState<Photo | null>(null);

  // Étape 2 — documents
  const [typePieceIdentite, setTypePieceIdentite] = useState<PieceIdentiteType | null>(null);
  const [pieceIdentite, setPieceIdentite] = useState<Photo | null>(null);
  const [permisConduire, setPermisConduire] = useState<Photo | null>(null);
  const [carteGrise, setCarteGrise] = useState<Photo | null>(null);
  const [assurance, setAssurance] = useState<Photo | null>(null);
  const [accepteConditions, setAccepteConditions] = useState(false);

  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const validationParEtape: boolean[] = [
    Boolean(nom.trim() && prenom.trim() && telephone.trim() && email.trim() && password.length >= 6 && zone),
    Boolean(typeVehicule && plaque.trim()),
    Boolean(typePieceIdentite && pieceIdentite && permisConduire && carteGrise && assurance && accepteConditions),
  ];

  function suivant() {
    if (!validationParEtape[etape]) return;
    setDirection("avant");
    setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  }

  function precedent() {
    setDirection("arriere");
    setEtape((e) => Math.max(e - 1, 0));
  }

  async function envoyer() {
    if (!zone || !typeVehicule || !typePieceIdentite || !pieceIdentite || !permisConduire || !carteGrise || !assurance) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const { utilisateur } = await inscrireTransporteur({
        email,
        password,
        nom,
        prenom,
        telephone,
        zone,
        quartier: quartier.trim() || undefined,
        nomEntreprise: nomEntreprise.trim() || undefined,
        typeVehicule,
        plaqueImmatriculation: plaque.trim(),
        capacitePoidsKg: capacitePoids.trim() ? Number(capacitePoids) : undefined,
        capaciteVolumeM3: capaciteVolume.trim() ? Number(capaciteVolume) : undefined,
        photoVehicule: photoVehicule ?? undefined,
        typePieceIdentite,
        pieceIdentite,
        permisConduire,
        carteGrise,
        assurance,
        accepteConditionsPartenariat: accepteConditions,
      });
      await notifierEvenement("compte_bienvenue", {
        declenchePar: utilisateur.id,
        destinataire: email,
        utilisateurId: utilisateur.id,
        variables: { prenom },
      });
      router.replace("/(transporteur)/dashboard");
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setErreur(message.includes("supprimé récemment") ? message : "Impossible d'envoyer l'inscription. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="px-6 pt-4">
        <Text className="mb-3 font-titre text-xl text-colimo-neutre-fonce">Inscription transporteur</Text>
        <Stepper etapes={ETAPES} etapeActuelle={etape} />
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Animated.View key={etape} entering={direction === "avant" ? SlideInRight.duration(220) : SlideInLeft.duration(220)}>
          {etape === 0 && (
            <>
              <ChampTexte label="Prénom" value={prenom} onChangeText={setPrenom} placeholder="Votre prénom" />
              <ChampTexte label="Nom" value={nom} onChangeText={setNom} placeholder="Votre nom" />
              <ChampTexte
                label="Téléphone"
                value={telephone}
                onChangeText={setTelephone}
                keyboardType="phone-pad"
                placeholder="+241 XX XXX XXX"
              />
              <ChampTexte
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="vous@exemple.com"
              />
              <ChampTexte
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="6 caractères minimum"
              />
              <ZoneSelector label="Commune" value={zone} onChange={setZone} />
              <ChampTexte label="Quartier (optionnel)" value={quartier} onChangeText={setQuartier} placeholder='Ex : "Nzeng-Ayong"' />
              <ChampTexte
                label="Nom de l'entreprise (optionnel)"
                value={nomEntreprise}
                onChangeText={setNomEntreprise}
                placeholder="Si vous représentez une société de transport"
              />
            </>
          )}

          {etape === 1 && (
            <>
              <GroupePastilles label="Type de véhicule" options={TYPES_VEHICULE} value={typeVehicule} onChange={setTypeVehicule} />
              {typeVehicule && JUSTIFICATIFS_COMPLEMENTAIRES_PAR_CATEGORIE[typeVehicule].length > 0 && (
                <Text className="-mt-2 mb-4 font-texte text-xs text-colimo-neutre-fonce/50">
                  Pour ce type de véhicule, COLIMO demandera aussi : {JUSTIFICATIFS_COMPLEMENTAIRES_PAR_CATEGORIE[typeVehicule].join(", ")}.
                </Text>
              )}
              <ChampTexte label="Plaque d'immatriculation" value={plaque} onChangeText={setPlaque} placeholder="Ex : GA-1234-AB" />
              <ChampTexte
                label="Capacité poids (kg, optionnel)"
                value={capacitePoids}
                onChangeText={setCapacitePoids}
                keyboardType="numeric"
                placeholder="0"
              />
              <ChampTexte
                label="Capacité volume (m³, optionnel)"
                value={capaciteVolume}
                onChangeText={setCapaciteVolume}
                keyboardType="numeric"
                placeholder="0"
              />
              <PhotoPicker
                label="Photo du véhicule (optionnel)"
                uri={photoVehicule?.uri ?? null}
                onChange={(uri, mimeType) => setPhotoVehicule({ uri, mimeType })}
                rond={false}
              />
              <Text className="mb-4 font-texte text-xs text-colimo-neutre-fonce/50">
                Vous pourrez ajouter d&apos;autres véhicules après la création de votre compte.
              </Text>
            </>
          )}

          {etape === 2 && (
            <>
              <GroupePastilles
                label="Type de pièce d'identité"
                options={PIECES_IDENTITE}
                value={typePieceIdentite}
                onChange={setTypePieceIdentite}
              />
              <PhotoPicker
                label="Photo de la pièce d'identité"
                uri={pieceIdentite?.uri ?? null}
                onChange={(uri, mimeType) => setPieceIdentite({ uri, mimeType })}
                rond={false}
              />
              <PhotoPicker
                label="Permis de conduire adapté au véhicule"
                uri={permisConduire?.uri ?? null}
                onChange={(uri, mimeType) => setPermisConduire({ uri, mimeType })}
                rond={false}
              />
              <PhotoPicker
                label="Carte grise du véhicule"
                uri={carteGrise?.uri ?? null}
                onChange={(uri, mimeType) => setCarteGrise({ uri, mimeType })}
                rond={false}
              />
              <PhotoPicker
                label="Assurance du véhicule"
                uri={assurance?.uri ?? null}
                onChange={(uri, mimeType) => setAssurance({ uri, mimeType })}
                rond={false}
              />

              <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-colimo-neutre-clair bg-white px-4 py-3.5">
                <Text className="mr-3 flex-1 font-texte text-sm text-colimo-neutre-fonce">
                  J&apos;accepte les{" "}
                  <Text className="font-texte-medium text-colimo-rouge">conditions de partenariat COLIMO TRANSPORT</Text>
                </Text>
                <Switch
                  value={accepteConditions}
                  onValueChange={setAccepteConditions}
                  trackColor={{ true: "#C41E24" }}
                  accessibilityLabel="Accepter les conditions de partenariat"
                />
              </View>

              <Text className="mb-4 font-texte text-xs text-colimo-neutre-fonce/50">
                Votre dossier sera examiné par COLIMO (statut EN_ATTENTE). Si un document est manquant ou illisible, vous
                pourrez le corriger et soumettre à nouveau votre dossier.
              </Text>
            </>
          )}
        </Animated.View>

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <View className="mt-2 flex-row gap-3">
          {etape > 0 && <Bouton label="Retour" variante="contour" onPress={precedent} className="flex-1" />}
          {etape < ETAPES.length - 1 ? (
            <Bouton label="Suivant" onPress={suivant} disabled={!validationParEtape[etape]} className="flex-1" />
          ) : (
            <Bouton
              label="Envoyer mon inscription"
              onPress={envoyer}
              disabled={!validationParEtape[etape] || envoiEnCours}
              chargement={envoiEnCours}
              className="flex-1"
            />
          )}
        </View>

        {etape === ETAPES.length - 1 && (
          <Text className="mb-8 mt-3 text-center font-texte text-xs text-colimo-neutre-fonce/50">
            En envoyant votre inscription, vous acceptez aussi nos{" "}
            <Text onPress={() => router.push("/cgu")} className="text-colimo-rouge">
              CGU
            </Text>{" "}
            et notre{" "}
            <Text onPress={() => router.push("/confidentialite")} className="text-colimo-rouge">
              politique de confidentialité
            </Text>
            .
          </Text>
        )}

        {zone && (
          <Text className="mb-4 text-center font-texte text-xs text-colimo-neutre-fonce/40">
            Commune sélectionnée : {ZONE_LABELS[zone]}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
