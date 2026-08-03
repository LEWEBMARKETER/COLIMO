import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/lib/AuthContext";

interface Lien {
  label: string;
  icone: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructif?: boolean;
}

/**
 * Bloc "compte" regroupé en bas de l'écran Profil — FAQ, textes légaux et
 * déconnexion vivaient auparavant en liens épars sur les accueils ; ils ont
 * une seule adresse maintenant que Profil est un onglet à part entière.
 */
export default function ParametresCompte() {
  const { signOut } = useAuth();

  async function handleDeconnexion() {
    await signOut();
    router.replace("/(auth)/login");
  }

  const liens: Lien[] = [
    { label: "FAQ", icone: "help-circle-outline", onPress: () => router.push("/faq") },
    { label: "Conditions générales d'utilisation", icone: "document-text-outline", onPress: () => router.push("/cgu") },
    {
      label: "Politique de confidentialité",
      icone: "shield-checkmark-outline",
      onPress: () => router.push("/confidentialite"),
    },
    { label: "Se déconnecter", icone: "log-out-outline", onPress: handleDeconnexion, destructif: true },
  ];

  return (
    <View className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
      {liens.map((lien, index) => (
        <Pressable
          key={lien.label}
          onPress={lien.onPress}
          className={`flex-row items-center gap-3 px-4 py-3.5 ${
            index < liens.length - 1 ? "border-b border-colimo-neutre-clair" : ""
          }`}
        >
          <Ionicons name={lien.icone} size={18} color={lien.destructif ? "#C41E24" : "#2B2622"} />
          <Text
            className={`font-texte text-sm ${lien.destructif ? "text-colimo-rouge" : "text-colimo-neutre-fonce"}`}
          >
            {lien.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
