import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function OtpScreen() {
  const [code, setCode] = useState("");

  // TODO: vérifier le code OTP via Supabase Auth une fois le provider SMS branché.
  function handleVerifier() {
    router.push("/(auth)/role");
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-1 justify-center px-6">
        <Text className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">
          Code de vérification
        </Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">
          Saisissez le code reçu par SMS
        </Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="123456"
          maxLength={6}
          className="mt-6 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-center text-2xl tracking-widest text-colimo-neutre-fonce"
        />

        <Pressable onPress={handleVerifier} className="mt-6 rounded-xl bg-colimo-rouge py-3">
          <Text className="text-center font-semibold text-white">Vérifier</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
