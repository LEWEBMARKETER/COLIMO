import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import SignalerEchecLivraisonForm from "@/components/SignalerEchecLivraisonForm";
import { useAuth } from "@/lib/AuthContext";

export default function EchecLivraisonCoursierScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { session } = useAuth();

  if (!session || !courseId) return null;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <SignalerEchecLivraisonForm courseId={courseId} coursierId={session.user.id} />
    </SafeAreaView>
  );
}
