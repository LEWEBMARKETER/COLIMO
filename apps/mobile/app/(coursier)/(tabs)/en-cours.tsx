import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import type { Course } from "@colimo/shared";
import EmptyState from "@/components/ui/EmptyState";
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
    <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond px-6">
      <EmptyState
        icone="navigate-outline"
        titre="Aucune course en cours"
        description="Accepte une course depuis le tableau de bord pour la retrouver ici."
        labelAction="Voir les courses disponibles"
        onAction={() => router.push("/(coursier)/dashboard")}
      />
    </SafeAreaView>
  );
}
