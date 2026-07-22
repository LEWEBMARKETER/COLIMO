import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
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
    } catch {
      setErreur("Email ou mot de passe incorrect.");
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

        <Text className="mt-10 text-sm font-medium text-colimo-neutre-fonce">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.com"
          className="mt-2 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Text className="mt-4 text-sm font-medium text-colimo-neutre-fonce">Mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          className="mt-2 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        {erreur && <Text className="mt-3 text-sm text-colimo-rouge">{erreur}</Text>}

        <Pressable
          onPress={handleConnexion}
          disabled={envoiEnCours}
          className="mt-6 flex-row items-center justify-center rounded-xl bg-colimo-rouge py-3"
        >
          {envoiEnCours && <ActivityIndicator color="white" className="mr-2" />}
          <Text className="text-center font-semibold text-white">Se connecter</Text>
        </Pressable>

        <View className="mt-8 gap-2">
          <Pressable onPress={() => router.push("/(auth)/register-client")}>
            <Text className="text-center text-sm text-colimo-neutre-fonce/70">
              Pas de compte ? <Text className="font-semibold text-colimo-rouge">Créer un compte client</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(auth)/register-coursier")}>
            <Text className="text-center text-sm text-colimo-neutre-fonce/70">
              Vous êtes coursier ? <Text className="font-semibold text-colimo-rouge">Créer un compte coursier</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
