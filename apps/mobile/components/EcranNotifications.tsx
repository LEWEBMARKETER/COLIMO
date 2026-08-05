import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CANAL_COMMUNICATION_LABELS, type CommunicationEnvoyee } from "@colimo/shared";
import { getMesCommunications, marquerCommunicationLue, marquerToutesCommunicationsLues } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

const ICONE_CANAL: Record<string, keyof typeof Ionicons.glyphMap> = {
  email: "mail-outline",
  sms: "chatbubble-outline",
  whatsapp: "logo-whatsapp",
  push: "notifications-outline",
};

interface EcranNotificationsProps {
  utilisateurId: string;
}

// Écran partagé entre (client)/notifications.tsx et (coursier)/notifications.tsx
// — même liste, même logique, seul le point d'entrée (route) diffère par
// groupe. Affiche toutes les communications adressées à l'utilisateur, quel
// que soit le canal (email/SMS/WhatsApp/push) : c'est son historique
// complet de notifications COLIMO.
export default function EcranNotifications({ utilisateurId }: EcranNotificationsProps) {
  const [communications, setCommunications] = useState<CommunicationEnvoyee[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);

  const charger = useCallback(async () => {
    try {
      const donnees = await getMesCommunications(utilisateurId);
      setCommunications(donnees);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [utilisateurId]);

  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, 10000);

    const channel = supabase
      .channel(`notifications-ecran-${utilisateurId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `utilisateur_id=eq.${utilisateurId}` },
        () => charger()
      )
      .subscribe();

    return () => {
      clearInterval(intervalle);
      supabase.removeChannel(channel);
    };
  }, [utilisateurId, charger]);

  async function ouvrir(communication: CommunicationEnvoyee) {
    if (communication.statut === "lu") return;
    setCommunications((prev) => prev.map((c) => (c.id === communication.id ? { ...c, statut: "lu" } : c)));
    try {
      await marquerCommunicationLue(communication.id);
    } catch {
      // Pas grave si ça échoue — le prochain rafraîchissement corrigera l'état.
    }
  }

  async function toutMarquerLu() {
    setCommunications((prev) => prev.map((c) => ({ ...c, statut: "lu" })));
    try {
      await marquerToutesCommunicationsLues(utilisateurId);
    } catch {
      charger();
    }
  }

  const nonLues = communications.filter((c) => c.statut !== "lu" && c.statut !== "echec").length;

  if (chargement) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-row items-center justify-between border-b border-colimo-neutre-clair px-5 py-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={20} color="#2B2622" />
          <Text className="font-titre text-lg text-colimo-neutre-fonce">Notifications</Text>
        </Pressable>
        {nonLues > 0 && (
          <Pressable onPress={toutMarquerLu}>
            <Text className="font-texte-medium text-xs text-colimo-rouge">Tout marquer comme lu</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={communications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={() => {
              setRafraichissement(true);
              charger();
            }}
            tintColor="#C41E24"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="notifications-off-outline" size={32} color="#2B262260" />
            <Text className="mt-3 font-texte text-sm text-colimo-neutre-fonce/60">
              Aucune notification pour l&apos;instant
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const nonLu = item.statut !== "lu" && item.statut !== "echec";
          return (
            <Pressable
              onPress={() => ouvrir(item)}
              className={`flex-row items-start gap-3 rounded-2xl border p-4 ${
                nonLu ? "border-colimo-rouge-clair bg-colimo-rouge-clair" : "border-colimo-neutre-clair bg-white"
              }`}
            >
              <Ionicons
                name={ICONE_CANAL[item.canal] ?? "notifications-outline"}
                size={20}
                color={nonLu ? "#C41E24" : "#2B262280"}
              />
              <View className="flex-1">
                <Text className="font-texte text-sm text-colimo-neutre-fonce">{item.contenu}</Text>
                <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/50">
                  {CANAL_COMMUNICATION_LABELS[item.canal]} · {new Date(item.createdAt).toLocaleString("fr-FR")}
                </Text>
              </View>
              {nonLu && <View className="mt-1 h-2 w-2 shrink-0 rounded-full bg-colimo-rouge" />}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
