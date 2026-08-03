import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import Carte from "@/components/ui/Carte";
import ChiffreCle from "@/components/ui/ChiffreCle";
import StatutChip from "@/components/ui/StatutChip";
import NoteEtoiles from "@/components/NoteEtoiles";
import { getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function GainsCoursierScreen() {
  const { session, coursier } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!session) return;
    getCourses({ coursierId: session.user.id })
      .then(setCourses)
      .finally(() => setChargement(false));
  }, [session]);

  if (chargement) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  const coursesConfirmees = courses.filter((c) => c.statut === "confirmee");
  const gainsBruts = coursesConfirmees.reduce((total, c) => total + c.prix, 0);
  const gainsNets = coursesConfirmees.reduce((total, c) => total + (c.prix - c.commission), 0);

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <Carte sombre>
          <View className="flex-row items-end justify-between">
            <ChiffreCle valeur={formatFCFA(gainsNets)} label="Gains nets cumulés" sombre />
            <NoteEtoiles note={coursier?.noteMoyenne ?? 0} />
          </View>
          <Text className="mt-3 font-texte text-[11px] text-white/50">
            Brut {formatFCFA(gainsBruts)} · Commission {formatFCFA(gainsBruts - gainsNets)}
          </Text>
        </Carte>

        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingTop: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">
              Aucune course pour l&apos;instant
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(coursier)/course/${item.id}`)}>
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">
                    {item.numeroCommande}
                  </Text>
                  <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                    {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <Text className="mt-1 font-texte-medium text-colimo-neutre-fonce">
                  {ZONE_LABELS[item.zoneDepart]} → {ZONE_LABELS[item.zoneArrivee]}
                </Text>
                <View className="mt-2.5 flex-row items-center justify-between">
                  <Text className="font-titre text-colimo-rouge">{formatFCFA(item.prix)}</Text>
                  <StatutChip statut={item.statut} intensite="douce" />
                </View>
                {item.statut === "confirmee" && (
                  <Text className="mt-1.5 font-texte text-[11px] text-colimo-neutre-fonce/50">
                    Net perçu : {formatFCFA(item.prix - item.commission)} (commission {formatFCFA(item.commission)})
                  </Text>
                )}
              </View>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
