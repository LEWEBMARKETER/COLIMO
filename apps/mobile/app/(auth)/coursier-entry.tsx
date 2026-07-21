import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useRole } from "@/lib/RoleContext";
import { DEMO_COURSIER_UTILISATEUR_ID } from "@/lib/session";

export default function CoursierEntryScreen() {
  const { setCourierUserId } = useRole();

  function seConnecter() {
    setCourierUserId(DEMO_COURSIER_UTILISATEUR_ID);
    router.replace("/(coursier)/dashboard");
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-1 justify-center px-6">
        <Text className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Espace coursier</Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">
          Connectez-vous à votre compte ou inscrivez-vous pour rejoindre COLIMO
        </Text>

        <Pressable onPress={seConnecter} className="mt-8 rounded-xl bg-colimo-rouge py-4">
          <Text className="text-center font-semibold text-white">J&apos;ai déjà un compte</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(auth)/register-coursier")}
          className="mt-3 rounded-xl border border-colimo-rouge py-4"
        >
          <Text className="text-center font-semibold text-colimo-rouge">Créer un compte coursier</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
