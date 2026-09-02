import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import { connecter } from "@/lib/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function handleConnexion() {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await connecter(email, password);
      router.replace("/");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Email ou mot de passe incorrect.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-1 justify-center px-6">
        <Image
          source={require("../../assets/logo-colimo.png")}
          style={{ width: 220, height: 63 }}
          resizeMode="contain"
        />

        <View className="mt-10">
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
            placeholder="••••••••"
          />
        </View>

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton label="Se connecter" onPress={handleConnexion} chargement={envoiEnCours} />

        <Pressable onPress={() => router.push("/(auth)/forgot-password")} className="mt-4">
          <Text className="text-center font-texte-medium text-sm text-colimo-rouge">Mot de passe oublié ?</Text>
        </Pressable>

        <View className="mt-8 gap-2">
          <Pressable onPress={() => router.push("/(auth)/register-client")}>
            <Text className="text-center font-texte text-sm text-colimo-neutre-fonce/70">
              Pas de compte ? <Text className="font-texte-medium text-colimo-rouge">Créer un compte client</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(auth)/register-coursier")}>
            <Text className="text-center font-texte text-sm text-colimo-neutre-fonce/70">
              Vous êtes coursier ?{" "}
              <Text className="font-texte-medium text-colimo-rouge">Créer un compte coursier</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(auth)/rejoindre-commerce")}>
            <Text className="text-center font-texte text-sm text-colimo-neutre-fonce/70">
              Vous avez été invité par un commerce ?{" "}
              <Text className="font-texte-medium text-colimo-rouge">Rejoindre</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/faq")}>
            <Text className="text-center font-texte text-sm text-colimo-neutre-fonce/50">FAQ</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
