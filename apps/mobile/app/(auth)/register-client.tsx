import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import ZoneSelector from "@/components/ZoneSelector";
import PhotoPicker from "@/components/PhotoPicker";
import { inscrireClient } from "@/lib/api";
import type { TypeClient, Zone } from "@colimo/shared";

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
        <Text className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Créer un compte client</Text>

        <Text className="mb-2 mt-6 text-sm font-medium text-colimo-neutre-fonce">Type de compte</Text>
        <View className="mb-4 flex-row gap-2">
          {(["particulier", "commerce"] as TypeClient[]).map((valeur) => {
            const selectionne = typeClient === valeur;
            return (
              <Pressable
                key={valeur}
                onPress={() => setTypeClient(valeur)}
                className={`flex-1 rounded-xl border py-3 ${
                  selectionne ? "border-colimo-rouge bg-colimo-rouge" : "border-colimo-neutre-clair bg-white"
                }`}
              >
                <Text className={`text-center font-medium ${selectionne ? "text-white" : "text-colimo-neutre-fonce"}`}>
                  {valeur === "particulier" ? "Particulier" : "Commerce"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">
          {typeClient === "commerce" ? "Nom du commerce" : "Nom complet"}
        </Text>
        <TextInput
          value={nom}
          onChangeText={setNom}
          placeholder={typeClient === "commerce" ? "Nom de votre commerce" : "Votre nom"}
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

        <ZoneSelector label="Zone (optionnel)" value={zone} onChange={setZone} />

        <PhotoPicker
          label={typeClient === "commerce" ? "Logo du commerce (optionnel)" : "Photo de profil (optionnel)"}
          uri={photo?.uri ?? null}
          onChange={(uri, mimeType) => setPhoto({ uri, mimeType })}
        />

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
            Créer mon compte
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
