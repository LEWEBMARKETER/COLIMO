import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function LoginScreen() {
  const [telephone, setTelephone] = useState("");

  // TODO: brancher l'envoi du code OTP via un provider SMS — écran UI seule pour l'instant.
  function handleContinuer() {
    router.push("/(auth)/otp");
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-1 justify-center px-6">
        <Text className="font-titre text-3xl font-bold text-colimo-rouge">COLIMO</Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">Directement chez vous</Text>

        <Text className="mt-10 text-sm font-medium text-colimo-neutre-fonce">Numéro de téléphone</Text>
        <TextInput
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
          placeholder="+241 XX XXX XXX"
          className="mt-2 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Pressable
          onPress={handleContinuer}
          className="mt-6 rounded-xl bg-colimo-rouge py-3"
        >
          <Text className="text-center font-semibold text-white">Recevoir le code</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
