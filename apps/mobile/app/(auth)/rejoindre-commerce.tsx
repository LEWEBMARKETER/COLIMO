import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import { inscrireMembreCommerce } from "@/lib/api";

export default function RejoindreCommerceScreen() {
  const [codeInvitation, setCodeInvitation] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const peutEnvoyer = Boolean(
    codeInvitation.trim() && nom.trim() && telephone.trim() && email.trim() && password.length >= 6
  );

  async function envoyer() {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await inscrireMembreCommerce({
        email,
        password,
        nom,
        telephone,
        codeInvitation: codeInvitation.trim().toUpperCase(),
      });
      router.replace("/");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de créer le compte. Vérifiez le code d'invitation.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Rejoindre un commerce</Text>
        <Text className="mt-2 font-texte text-sm text-colimo-neutre-fonce/70">
          Renseignez le code d&apos;invitation transmis par le commerce pour créer votre compte.
        </Text>

        <ChampTexte
          label="Code d'invitation"
          value={codeInvitation}
          onChangeText={setCodeInvitation}
          autoCapitalize="characters"
          placeholder="EX. A1B2C3D4"
          className="mt-6"
        />

        <ChampTexte label="Nom complet" value={nom} onChangeText={setNom} placeholder="Votre nom" />

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

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton label="Rejoindre le commerce" onPress={envoyer} disabled={!peutEnvoyer} chargement={envoiEnCours} />
      </ScrollView>
    </SafeAreaView>
  );
}
