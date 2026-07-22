import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { formatFCFA, ZONE_LABELS, type Course } from "@colimo/shared";
import { getCourses, patchCoursier, patchCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function CoursierDashboard() {
  const { session, utilisateur, coursier, refreshProfile, signOut } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);

  const chargerCourses = useCallback(async () => {
    if (coursier?.disponibilite && utilisateur?.zone) {
      setCourses(await getCourses({ zone: utilisateur.zone, statut: "en_attente" }));
    } else {
      setCourses([]);
    }
  }, [coursier?.disponibilite, utilisateur?.zone]);

  useEffect(() => {
    setChargement(true);
    chargerCourses().finally(() => setChargement(false));
  }, [chargerCourses]);

  useFocusEffect(
    useCallback(() => {
      chargerCourses();
    }, [chargerCourses])
  );

  async function toggleDisponibilite(valeur: boolean) {
    if (!coursier) return;
    await patchCoursier(coursier.id, { disponibilite: valeur });
    await refreshProfile();
  }

  async function accepter(course: Course) {
    if (!session) return;
    await patchCourse(course.id, { statut: "acceptee", coursierId: session.user.id });
    router.push(`/(coursier)/course/${course.id}`);
  }

  async function handleDeconnexion() {
    await signOut();
    router.replace("/(auth)/login");
  }

  if (chargement) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3">
          <View>
            <Text className="font-medium text-colimo-neutre-fonce">Disponible</Text>
            <Text className="text-xs text-colimo-neutre-fonce/60">
              Zone : {utilisateur?.zone ? ZONE_LABELS[utilisateur.zone] : "—"}
            </Text>
          </View>
          <Switch
            value={coursier?.disponibilite ?? false}
            onValueChange={toggleDisponibilite}
            disabled={coursier?.statutVerification !== "valide"}
          />
        </View>

        {coursier?.statutVerification !== "valide" ? (
          <Text className="mt-6 text-center text-colimo-neutre-fonce/60">
            Votre inscription est en cours de validation par COLIMO. Vous pourrez accepter des
            courses une fois validé·e.
          </Text>
        ) : !coursier?.disponibilite ? (
          <Text className="mt-6 text-center text-colimo-neutre-fonce/60">
            Passez disponible pour voir les courses de votre zone
          </Text>
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12 }}
            ListEmptyComponent={
              <Text className="mt-6 text-center text-colimo-neutre-fonce/60">
                Aucune course disponible pour l&apos;instant
              </Text>
            }
            renderItem={({ item }) => (
              <View className="rounded-2xl border border-colimo-neutre-clair bg-white p-4">
                <Text className="font-medium text-colimo-neutre-fonce">
                  {item.adresseDepart} → {item.adresseArrivee}
                </Text>
                <Text className="mt-1 text-sm text-colimo-neutre-fonce/70">{item.typeColis}</Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="font-titre font-semibold text-colimo-rouge">
                    {formatFCFA(item.prix)}
                  </Text>
                  <Pressable onPress={() => accepter(item)} className="rounded-lg bg-colimo-rouge px-4 py-2">
                    <Text className="text-sm font-semibold text-white">Accepter</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        <Pressable onPress={handleDeconnexion} className="mt-4 py-2">
          <Text className="text-center text-sm text-colimo-neutre-fonce/60">Se déconnecter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
