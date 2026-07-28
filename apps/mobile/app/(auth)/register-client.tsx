import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import ZoneSelector from "@/components/ZoneSelector";
import PhotoPicker from "@/components/PhotoPicker";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { inscrireClient } from "@/lib/api";
import type { TypeClient, Zone } from "@colimo/shared";

const TYPES_CLIENT: { valeur: TypeClient; label: string }[] = [
  { valeur: "particulier", label: "Particulier" },
  { valeur: "commerce", label: "Commerce" },
];

export default function RegisterClientScreen() {
  const [typeClient, setTypeClient] = useState<TypeClient>("particulier");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const peutEnvoyer = Boolean(nom.trim() && telephone.trim() && email.trim() && password.length >= 6);

  async function envoyer() {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await inscrireClient({
        email,
        password,
        nom,
        telephone,
        typeClient,
        zone: zone ?? undefined,
        photo: photo ?? undefined,
      });
      router.replace("/");
    } catch {
      setErreur("Impossible de créer le compte. Vérifiez vos informations.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Créer un compte client</Text>

        <GroupePastilles
          label="Type de compte"
          options={TYPES_CLIENT}
          value={typeClient}
          onChange={setTypeClient}
          className="mt-6"
        />

        <ChampTexte
          label={typeClient === "commerce" ? "Nom du commerce" : "Nom complet"}
          value={nom}
          onChangeText={setNom}
          placeholder={typeClient === "commerce" ? "Nom de votre commerce" : "Votre nom"}
        />

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

        <ZoneSelector label="Zone (optionnel)" value={zone} onChange={setZone} />

        <PhotoPicker
          label={typeClient === "commerce" ? "Logo du commerce (optionnel)" : "Photo de profil (optionnel)"}
          uri={photo?.uri ?? null}
          onChange={(uri, mimeType) => setPhoto({ uri, mimeType })}
        />

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton
          label="Créer mon compte"
          onPress={envoyer}
          disabled={!peutEnvoyer}
          chargement={envoiEnCours}
          className="mb-8"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
