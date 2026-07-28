import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PIECE_IDENTITE_LABELS, ZONE_LABELS, type PieceIdentiteType, type VehiculeType, type Zone } from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import PhotoPicker from "@/components/PhotoPicker";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { inscrireCoursier } from "@/lib/api";

const VEHICULES: { valeur: VehiculeType; label: string }[] = [
  { valeur: "moto", label: "Moto" },
  { valeur: "velo", label: "Vélo" },
  { valeur: "voiture", label: "Voiture" },
  { valeur: "pied", label: "À pied" },
];

const PIECES_IDENTITE = (Object.keys(PIECE_IDENTITE_LABELS) as PieceIdentiteType[]).map((valeur) => ({
  valeur,
  label: PIECE_IDENTITE_LABELS[valeur],
}));

export default function RegisterCoursierScreen() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [typeVehicule, setTypeVehicule] = useState<VehiculeType | null>(null);
  const [typePieceIdentite, setTypePieceIdentite] = useState<PieceIdentiteType | null>(null);
  const [pieceIdentite, setPieceIdentite] = useState<{ uri: string; mimeType: string } | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const peutEnvoyer = Boolean(
    nom.trim() &&
      prenom.trim() &&
      telephone.trim() &&
      email.trim() &&
      password.length >= 6 &&
      zone &&
      typeVehicule &&
      typePieceIdentite &&
      pieceIdentite
  );

  async function envoyer() {
    if (!zone || !typeVehicule || !typePieceIdentite || !pieceIdentite) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      await inscrireCoursier({
        email,
        password,
        nom,
        prenom,
        telephone,
        zone,
        typeVehicule,
        typePieceIdentite,
        pieceIdentite,
        photo: photo ?? undefined,
      });
      router.replace("/(coursier)/dashboard");
    } catch {
      setErreur("Impossible d'envoyer l'inscription. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Inscription coursier</Text>
        <Text className="mt-1 font-texte text-colimo-neutre-fonce/70">
          Votre compte sera validé par COLIMO avant de pouvoir accepter des courses
        </Text>

        <ChampTexte
          label="Prénom"
          value={prenom}
          onChangeText={setPrenom}
          placeholder="Votre prénom"
          className="mt-6"
        />

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

        <ZoneSelector label="Zone d'activité" value={zone} onChange={setZone} />

        <GroupePastilles label="Type de véhicule" options={VEHICULES} value={typeVehicule} onChange={setTypeVehicule} />

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
          label="Photo de profil (optionnel)"
          uri={photo?.uri ?? null}
          onChange={(uri, mimeType) => setPhoto({ uri, mimeType })}
        />

        {zone && (
          <Text className="mb-4 font-texte text-xs text-colimo-neutre-fonce/50">
            Zone sélectionnée : {ZONE_LABELS[zone]}
          </Text>
        )}

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton
          label="Envoyer mon inscription"
          onPress={envoyer}
          disabled={!peutEnvoyer}
          chargement={envoiEnCours}
          className="mb-8"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
