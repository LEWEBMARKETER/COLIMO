import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import ZoneSelector from "@/components/ZoneSelector";
import { inscrireClient } from "@/lib/api";
import type { Zone } from "@colimo/shared";

export default function RegisterClientScreen() {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const peutEnvoyer = Boolean(nom.trim() && telephone.trim() && email.trim() && password.length >= 6);

  async function envoyer() {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await inscrireClient({ email, password, nom, telephone, zone: zone ?? undefined });
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

        <Text className="mb-2 mt-6 text-sm font-medium text-colimo-neutre-fonce">Nom complet</Text>
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

        <ZoneSelector label="Zone (optionnel)" value={zone} onChange={setZone} />

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
