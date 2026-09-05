import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { activerNotificationsPush, notificationsPushDisponibles } from "@/lib/push";

const CLE_IGNORE = "colimo_push_ignore";

interface BandeauNotificationsPushProps {
  utilisateurId: string;
}

// N'apparaît que sur le web (PWA) — indisponible en natif — et seulement si
// la permission n'a jamais été demandée. "Plus tard" ne redemande plus tant
// que le navigateur/appareil ne change pas (pas de nag à chaque visite).
export default function BandeauNotificationsPush({ utilisateurId }: BandeauNotificationsPushProps) {
  const [visible, setVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!notificationsPushDisponibles() || Notification.permission !== "default") return;
    try {
      if (localStorage.getItem(CLE_IGNORE) === "1") return;
    } catch {
      // localStorage indisponible (navigation privée...) : on affiche quand même.
    }
    setVisible(true);
  }, []);

  async function activer() {
    setEnCours(true);
    try {
      const ok = await activerNotificationsPush(utilisateurId);
      if (ok) setVisible(false);
    } finally {
      setEnCours(false);
    }
  }

  function ignorer() {
    try {
      localStorage.setItem(CLE_IGNORE, "1");
    } catch {
      // Ignoré si indisponible.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-colimo-neutre-clair bg-white p-4">
      <View className="flex-1 pr-3">
        <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">Activer les notifications</Text>
        <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/60">
          Soyez averti·e en temps réel de vos livraisons, même l&apos;app fermée.
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Text onPress={ignorer} className="font-texte text-xs text-colimo-neutre-fonce/50">
          Plus tard
        </Text>
        <Pressable onPress={activer} disabled={enCours} className="rounded-full bg-colimo-rouge px-3 py-1.5">
          <Text className="font-texte-medium text-xs text-white">{enCours ? "…" : "Activer"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
