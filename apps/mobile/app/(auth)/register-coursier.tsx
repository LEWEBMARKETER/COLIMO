import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PIECE_IDENTITE_LABELS, ZONE_LABELS, type PieceIdentiteType, type VehiculeType, type Zone } from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import PhotoPicker from "@/components/PhotoPicker";
import { inscrireCoursier } from "@/lib/api";

const VEHICULES: { valeur: VehiculeType; label: string }[] = [
  { valeur: "moto", label: "Moto" },
  { valeur: "velo", label: "Vélo" },
  { valeur: "voiture", label: "Voiture" },
  { valeur: "pied", label: "À pied" },
];

const PIECES_IDENTITE = Object.keys(PIECE_IDENTITE_LABELS) as PieceIdentiteType[];

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
        <Text className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">
          Inscription coursier
        </Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">
          Votre compte sera validé par COLIMO avant de pouvoir accepter des courses
        </Text>

        <Text className="mb-2 mt-6 text-sm font-medium text-colimo-neutre-fonce">Prénom</Text>
        <TextInput
          value={prenom}
          onChangeText={setPrenom}
          placeholder="Votre prénom"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Nom</Text>
        <TextInput
          value={nom}
          onChangeText={setNom}
          placeholder="Votre nom"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Téléphone</Text>
        <TextInput
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
          placeholder="+241 XX XXX XXX"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.com"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="6 caractères minimum"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <ZoneSelector label="Zone d'activité" value={zone} onChange={setZone} />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Type de véhicule</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {VEHICULES.map((v) => {
            const selectionne = typeVehicule === v.valeur;
            return (
              <Pressable
                key={v.valeur}
                onPress={() => setTypeVehicule(v.valeur)}
                className={`rounded-full border px-4 py-2 ${
                  selectionne ? "border-colimo-rouge bg-colimo-rouge" : "border-colimo-neutre-clair bg-white"
                }`}
              >
                <Text className={selectionne ? "text-white" : "text-colimo-neutre-fonce"}>{v.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Type de pièce d'identité</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {PIECES_IDENTITE.map((piece) => {
            const selectionne = typePieceIdentite === piece;
            return (
              <Pressable
                key={piece}
                onPress={() => setTypePieceIdentite(piece)}
                className={`rounded-full border px-4 py-2 ${
                  selectionne ? "border-colimo-rouge bg-colimo-rouge" : "border-colimo-neutre-clair bg-white"
                }`}
              >
                <Text className={selectionne ? "text-white" : "text-colimo-neutre-fonce"}>
                  {PIECE_IDENTITE_LABELS[piece]}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
          <Text className="mb-4 text-xs text-colimo-neutre-fonce/50">
            Zone sélectionnée : {ZONE_LABELS[zone]}
          </Text>
        )}

        {erreur && <Text className="mb-4 text-sm text-colimo-rouge">{erreur}</Text>}

        <Pressable
          disabled={!peutEnvoyer || envoiEnCours}
          onPress={envoyer}
          className={`mb-8 flex-row items-center justify-center rounded-xl py-4 ${
            peutEnvoyer ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"
          }`}
        >
          {envoiEnCours && <ActivityIndicator color="white" className="mr-2" />}
          <Text className={`text-center font-semibold ${peutEnvoyer ? "text-white" : "text-colimo-neutre-fonce/50"}`}>
            Envoyer mon inscription
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
