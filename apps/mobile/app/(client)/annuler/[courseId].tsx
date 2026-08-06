import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import AnnulerCourseForm from "@/components/AnnulerCourseForm";
import { useAuth } from "@/lib/AuthContext";

export default function AnnulerCourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { session } = useAuth();

  if (!session || !courseId) return null;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <AnnulerCourseForm courseId={courseId} clientId={session.user.id} />
    </SafeAreaView>
  );
}
