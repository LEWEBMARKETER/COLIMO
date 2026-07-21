import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { formatFCFA, ZONE_LABELS, type Course } from "@colimo/shared";
import { getCoursiers, getCourses, patchCoursier, patchCourse, type CoursierAvecUtilisateur } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";

export default function CoursierDashboard() {
  const { courierUserId } = useRole();
  const [moi, setMoi] = useState<CoursierAvecUtilisateur | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    const coursiers = await getCoursiers();
    const trouve = coursiers.find((c) => c.utilisateurId === courierUserId) ?? null;
    setMoi(trouve);

    if (trouve?.disponibilite && trouve.utilisateur.zone) {
      const disponibles = await getCourses({ zone: trouve.utilisateur.zone, statut: "en_attente" });
      setCourses(disponibles);
    } else {
      setCourses([]);
    }
  }, [courierUserId]);

  useEffect(() => {
    setChargement(true);
    charger().finally(() => setChargement(false));
  }, [charger]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  async function toggleDisponibilite(valeur: boolean) {
    if (!moi) return;
    setMoi({ ...moi, disponibilite: valeur });
    await patchCoursier(moi.id, { disponibilite: valeur });
    charger();
  }

  async function accepter(course: Course) {
    await patchCourse(course.id, { statut: "acceptee", coursierId: courierUserId });
    router.push(`/(coursier)/course/${course.id}`);
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
              Zone : {moi?.utilisateur.zone ? ZONE_LABELS[moi.utilisateur.zone] : "—"}
            </Text>
          </View>
          <Switch value={moi?.disponibilite ?? false} onValueChange={toggleDisponibilite} />
        </View>

        {moi?.statutVerification !== "valide" ? (
          <Text className="mt-6 text-center text-colimo-neutre-fonce/60">
            Votre inscription est en cours de validation par COLIMO. Vous pourrez accepter des
            courses une fois validé·e.
          </Text>
        ) : !moi?.disponibilite ? (
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
      </View>
    </SafeAreaView>
  );
}
