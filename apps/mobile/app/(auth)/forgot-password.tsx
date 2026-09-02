import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { emailValide } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import { demanderReinitialisationMotDePasse } from "@/lib/api";

const MESSAGE_GENERIQUE =
  "Si un compte COLIMO est associé à cette adresse, vous recevrez un e-mail contenant les instructions de réinitialisation.";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer() {
    setErreur(null);
    if (!emailValide(email)) {
      setErreur("Adresse e-mail invalide.");
      return;
    }
    setEnvoiEnCours(true);
    try {
      await demanderReinitialisationMotDePasse(email.trim());
      // Systématiquement le même message, que le compte existe ou non —
      // ne jamais permettre de deviner quelles adresses ont un compte COLIMO.
      setEnvoye(true);
    } catch {
      setErreur("Impossible d'envoyer la demande pour le moment. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (envoye) {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond">
        <View className="flex-1 justify-center px-6">
          <Text className="font-titre text-2xl text-colimo-neutre-fonce">E-mail envoyé</Text>
          <Text className="mt-3 font-texte text-sm text-colimo-neutre-fonce/70">{MESSAGE_GENERIQUE}</Text>
          <Bouton
            label="Retour à la connexion"
            variante="contour"
            onPress={() => router.replace("/(auth)/login")}
            className="mt-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-1 justify-center px-6">
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Réinitialiser votre mot de passe</Text>
        <Text className="mt-2 font-texte text-sm text-colimo-neutre-fonce/70">
          Entrez l&apos;adresse e-mail associée à votre compte COLIMO. Nous vous enverrons un lien pour créer un
          nouveau mot de passe.
        </Text>

        <View className="mt-8">
          <ChampTexte
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="vous@exemple.com"
          />
        </View>

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton label="Envoyer le lien de réinitialisation" onPress={envoyer} chargement={envoiEnCours} />
      </View>
    </SafeAreaView>
  );
}
