import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import SignalerLitigeForm from "@/components/SignalerLitigeForm";
import { useAuth } from "@/lib/AuthContext";

export default function LitigeClientScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { session } = useAuth();

  if (!session || !courseId) return null;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <SignalerLitigeForm courseId={courseId} auteurId={session.user.id} />
    </SafeAreaView>
  );
}
