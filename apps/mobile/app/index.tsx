import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/AuthContext";

export default function Index() {
  const { session, utilisateur, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </View>
    );
  }

  if (!session) return <Redirect href="/accueil" />;
  if (utilisateur?.type === "coursier") return <Redirect href="/(coursier)/dashboard" />;
  return <Redirect href="/(client)" />;
}
