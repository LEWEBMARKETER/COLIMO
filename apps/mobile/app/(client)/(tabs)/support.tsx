import { SafeAreaView } from "react-native-safe-area-context";
import EcranSupport from "@/components/EcranSupport";

export default function SupportClientScreen() {
  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <EcranSupport />
    </SafeAreaView>
  );
}
