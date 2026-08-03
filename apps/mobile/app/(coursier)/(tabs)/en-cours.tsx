import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import type { Course } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import { getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const STATUTS_ACTIFS = new Set(["acceptee", "retrait", "en_cours"]);

export default function EnCoursScreen() {
  const { session } = useAuth();
  const [courseActive, setCourseActive] = useState<Course | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!session) return;
    let annule = false;
    getCourses({ coursierId: session.user.id })
      .then((courses) => {
        if (annule) return;
        setCourseActive(courses.find((c) => STATUTS_ACTIFS.has(c.statut)) ?? null);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, [session]);

  if (chargement) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  if (courseActive) {
    return <Redirect href={`/(coursier)/course/${courseActive.id}`} />;
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond px-8">
      <Text className="text-center font-titre text-lg text-colimo-neutre-fonce">Aucune course en cours</Text>
      <Text className="mt-2 text-center font-texte text-sm text-colimo-neutre-fonce/60">
        Accepte une course depuis le tableau de bord pour la retrouver ici.
      </Text>
      <Bouton
        label="Voir les courses disponibles"
        onPress={() => router.push("/(coursier)/dashboard")}
        className="mt-6 px-6 py-3"
      />
    </SafeAreaView>
  );
}
