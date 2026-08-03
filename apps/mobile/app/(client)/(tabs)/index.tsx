import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import StatutChip from "@/components/ui/StatutChip";
import CommerceDashboard from "@/components/CommerceDashboard";
import { getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const STATUTS_TERMINES = new Set(["confirmee", "annulee"]);

export default function ClientHome() {
  const { session, utilisateur } = useAuth();
  const [courseActive, setCourseActive] = useState<Course | null>(null);

  useEffect(() => {
    if (!session) return;
    getCourses({ clientId: session.user.id }).then((courses) => {
      const active = courses.find((c) => !STATUTS_TERMINES.has(c.statut));
      setCourseActive(active ?? null);
    });
  }, [session]);

  if (utilisateur?.typeClient === "commerce") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
        <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
          <CommerceDashboard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-row items-center gap-3">
          {utilisateur?.photoUrl ? (
            <Image source={{ uri: utilisateur.photoUrl }} className="h-12 w-12 rounded-full" />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-colimo-rouge-clair">
              <Text className="font-titre text-colimo-rouge">{(utilisateur?.nom ?? "?").charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text className="font-titre text-xl text-colimo-neutre-fonce">
              Bonjour {utilisateur?.prenom ?? utilisateur?.nom ?? ""} 👋
            </Text>
            <Text className="mt-0.5 font-texte text-sm text-colimo-neutre-fonce/70">
              Où souhaitez-vous envoyer un colis aujourd&apos;hui ?
            </Text>
          </View>
        </View>

        {courseActive && (
          <Pressable onPress={() => router.push(`/(client)/track/${courseActive.id}`)} className="mt-6">
            <View className="rounded-2xl bg-white p-4 shadow-sm">
              <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">Course en cours</Text>
              <Text className="mt-1 font-texte-medium text-colimo-neutre-fonce">
                {ZONE_LABELS[courseActive.zoneDepart]} → {ZONE_LABELS[courseActive.zoneArrivee]}
              </Text>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="font-titre text-colimo-rouge">{formatFCFA(courseActive.prix)}</Text>
                <StatutChip statut={courseActive.statut} intensite="douce" />
              </View>
            </View>
          </Pressable>
        )}

        <View className="mt-auto pt-8">
          <Bouton label="Nouvelle course" onPress={() => router.push("/(client)/publish")} />

          <Bouton
            label="Mes courses"
            variante="contour"
            onPress={() => router.push("/(client)/historique")}
            className="mt-3"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
