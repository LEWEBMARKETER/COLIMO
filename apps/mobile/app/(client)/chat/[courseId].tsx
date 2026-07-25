import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import ChatThread from "@/components/ChatThread";
import { useAuth } from "@/lib/AuthContext";

export default function ChatClientScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { session } = useAuth();

  if (!session || !courseId) return null;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ChatThread courseId={courseId} moiId={session.user.id} />
    </SafeAreaView>
  );
}
