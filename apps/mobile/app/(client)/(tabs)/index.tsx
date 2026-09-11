import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import StatutChip from "@/components/ui/StatutChip";
import CarteAction from "@/components/ui/CarteAction";
import CarteInfoConfiance from "@/components/ui/CarteInfoConfiance";
import CarteCourseRecente from "@/components/ui/CarteCourseRecente";
import BandeauNotificationsPush from "@/components/BandeauNotificationsPush";
import ClocheNotifications from "@/components/ClocheNotifications";
import CommerceDashboard from "@/components/CommerceDashboard";
import { getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const STATUTS_TERMINES = new Set(["confirmee", "annulee"]);

export default function ClientHome() {
  const { session, utilisateur } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!session) return;
    // Une seule requête, réutilisée pour la course active et "Vos dernières
    // livraisons" — évite un second appel réseau pour la même donnée.
    getCourses({ clientId: session.user.id }).then(setCourses);
  }, [session]);

  if (utilisateur?.typeClient === "commerce") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
        <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
          {session && (
            <View className="mb-2 flex-row justify-end">
              <ClocheNotifications utilisateurId={session.user.id} route="/(client)/notifications" />
            </View>
          )}
          {session && <BandeauNotificationsPush utilisateurId={session.user.id} />}
          <CommerceDashboard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const courseActive = courses.find((c) => !STATUTS_TERMINES.has(c.statut)) ?? null;
  const dernieresCourses = courses.slice(0, 5);

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center gap-3">
          {utilisateur?.photoUrl ? (
            <Image source={{ uri: utilisateur.photoUrl }} className="h-12 w-12 rounded-full" />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-colimo-rouge-clair">
              <Text className="font-titre text-colimo-rouge">{(utilisateur?.nom ?? "?").charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-titre text-xl text-colimo-neutre-fonce" numberOfLines={1}>
              Bonjour {utilisateur?.prenom ?? utilisateur?.nom ?? ""} 👋
            </Text>
            <Text className="mt-0.5 font-texte text-sm text-colimo-neutre-fonce/70" numberOfLines={2}>
              Vos envois de colis partout dans le Grand Libreville
            </Text>
          </View>
          {session && <ClocheNotifications utilisateurId={session.user.id} route="/(client)/notifications" />}
        </View>

        {session && (
          <View className="mt-4">
            <BandeauNotificationsPush utilisateurId={session.user.id} />
          </View>
        )}

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

        <View className="mt-6">
          <Text className="font-titre text-base text-colimo-neutre-fonce">Que souhaitez-vous faire ?</Text>
          <View className="mt-3 flex-row flex-wrap gap-3">
            <CarteAction icone="cube-outline" titre="Envoyer un colis" onPress={() => router.push("/(client)/publish")} />
            <CarteAction
              icone="location-outline"
              titre="Suivre une course"
              onPress={() =>
                courseActive ? router.push(`/(client)/track/${courseActive.id}`) : router.push("/(client)/historique")
              }
            />
            <CarteAction
              icone="time-outline"
              titre="Mes dernières courses"
              onPress={() => router.push("/(client)/historique")}
            />
          </View>
        </View>

        {dernieresCourses.length > 0 && (
          <View className="mt-6">
            <Text className="font-titre text-base text-colimo-neutre-fonce">Vos dernières livraisons</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ paddingRight: 6 }}
            >
              {dernieresCourses.map((course) => (
                <CarteCourseRecente key={course.id} course={course} />
              ))}
            </ScrollView>
          </View>
        )}

        <View className="mt-6">
          <View className="flex-row flex-wrap gap-3">
            <CarteInfoConfiance
              icone="location-outline"
              titre="Grand Libreville"
              description="Livraisons dans les zones couvertes par COLIMO"
            />
            <CarteInfoConfiance
              icone="bicycle-outline"
              titre="Coursiers partenaires"
              description="Un réseau de coursiers pour vos livraisons"
            />
            <CarteInfoConfiance
              icone="navigate-outline"
              titre="Suivi de course"
              description="Suivez votre colis pendant son acheminement"
            />
            <CarteInfoConfiance
              icone="shield-checkmark-outline"
              titre="Livraison sécurisée"
              description="Confirmation de livraison et preuve de remise"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
