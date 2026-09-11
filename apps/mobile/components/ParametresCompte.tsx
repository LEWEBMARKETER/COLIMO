import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/lib/AuthContext";
import { definirSonNotificationsActive, sonNotificationsActive } from "@/lib/sonIdentite";
import {
  activerNotificationsPush,
  desactiverNotificationsPush,
  notificationsPushActives,
  notificationsPushDisponibles,
} from "@/lib/push";

interface Lien {
  label: string;
  icone: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructif?: boolean;
}

/**
 * Espace "Paramètres du compte" — notifications (son + push), sécurité
 * (mot de passe, suppression du compte), FAQ/légal et déconnexion.
 * Regroupé en bas de l'écran Profil.
 */
export default function ParametresCompte() {
  const { signOut, session } = useAuth();
  const [sonActif, setSonActif] = useState(sonNotificationsActive);
  const [pushActif, setPushActif] = useState(false);
  const [pushEnCours, setPushEnCours] = useState(false);

  useEffect(() => {
    if (!notificationsPushDisponibles()) return;
    notificationsPushActives().then(setPushActif);
  }, []);

  function basculerSon(actif: boolean) {
    setSonActif(actif);
    definirSonNotificationsActive(actif);
  }

  async function basculerPush(actif: boolean) {
    if (!session) return;
    setPushEnCours(true);
    try {
      const ok = actif ? await activerNotificationsPush(session.user.id) : await desactiverNotificationsPush();
      if (ok) setPushActif(actif);
    } finally {
      setPushEnCours(false);
    }
  }

  async function handleDeconnexion() {
    await signOut();
    router.replace("/(auth)/login");
  }

  const liensSecurite: Lien[] = [
    { label: "Changer le mot de passe", icone: "lock-closed-outline", onPress: () => router.push("/(client)/compte/mot-de-passe") },
    {
      label: "Supprimer mon compte",
      icone: "trash-outline",
      onPress: () => router.push("/(client)/compte/supprimer"),
      destructif: true,
    },
  ];

  const liensInfos: Lien[] = [
    { label: "FAQ", icone: "help-circle-outline", onPress: () => router.push("/faq") },
    { label: "Conditions générales d'utilisation", icone: "document-text-outline", onPress: () => router.push("/cgu") },
    {
      label: "Politique de confidentialité",
      icone: "shield-checkmark-outline",
      onPress: () => router.push("/confidentialite"),
    },
    { label: "Se déconnecter", icone: "log-out-outline", onPress: handleDeconnexion, destructif: true },
  ];

  function Groupe({ liens }: { liens: Lien[] }) {
    return (
      <View className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        {liens.map((lien, index) => (
          <Pressable
            key={lien.label}
            onPress={lien.onPress}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${
              index < liens.length - 1 ? "border-b border-colimo-neutre-clair" : ""
            }`}
          >
            <Ionicons name={lien.icone} size={18} color={lien.destructif ? "#C41E24" : "#2B2622"} />
            <Text className={`font-texte text-sm ${lien.destructif ? "text-colimo-rouge" : "text-colimo-neutre-fonce"}`}>
              {lien.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="mt-8">
      <Text className="px-1 font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
        Notifications
      </Text>
      <View className="mt-2 overflow-hidden rounded-2xl bg-white shadow-sm">
        <View
          className={`flex-row items-center justify-between gap-3 px-4 py-3.5 ${
            notificationsPushDisponibles() ? "border-b border-colimo-neutre-clair" : ""
          }`}
        >
          <View className="flex-1 flex-row items-center gap-3">
            <Ionicons name="musical-notes-outline" size={18} color="#2B2622" />
            <Text className="font-texte text-sm text-colimo-neutre-fonce">Son des notifications</Text>
          </View>
          <Switch
            value={sonActif}
            onValueChange={basculerSon}
            trackColor={{ true: "#C41E24" }}
            accessibilityLabel="Activer ou désactiver le son des notifications"
          />
        </View>
        {notificationsPushDisponibles() && (
          <View className="flex-row items-center justify-between gap-3 px-4 py-3.5">
            <View className="flex-1 flex-row items-center gap-3">
              <Ionicons name="notifications-outline" size={18} color="#2B2622" />
              <Text className="font-texte text-sm text-colimo-neutre-fonce">Notifications push</Text>
            </View>
            <Switch
              value={pushActif}
              onValueChange={basculerPush}
              disabled={pushEnCours}
              trackColor={{ true: "#C41E24" }}
              accessibilityLabel="Activer ou désactiver les notifications push"
            />
          </View>
        )}
      </View>

      <Text className="mt-6 px-1 font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
        Sécurité
      </Text>
      <Groupe liens={liensSecurite} />

      <Text className="mt-6 px-1 font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
        Compte
      </Text>
      <Groupe liens={liensInfos} />
    </View>
  );
}
