import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { formatFCFA, ZONE_LABELS, type Course, type Zone } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import { getCourses, patchCoursier, patchCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function CoursierDashboard() {
  const { session, utilisateur, coursier, refreshProfile, signOut } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [gains, setGains] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getCourses({ coursierId: session.user.id }).then((mesCourses) => {
      const total = mesCourses.filter((c) => c.statut === "confirmee").reduce((s, c) => s + c.prix, 0);
      setGains(total);
    });
  }, [session]);

  const zonesDisponibilite: Zone[] = coursier?.zonesCouvertes?.length
    ? coursier.zonesCouvertes
    : utilisateur?.zone
      ? [utilisateur.zone]
      : [];

  const chargerCourses = useCallback(async () => {
    if (coursier?.disponibilite && zonesDisponibilite.length > 0) {
      setCourses(await getCourses({ zones: zonesDisponibilite, statut: "en_attente" }));
    } else {
      setCourses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coursier?.disponibilite, JSON.stringify(zonesDisponibilite)]);

  useEffect(() => {
    setChargement(true);
    chargerCourses().finally(() => setChargement(false));
  }, [chargerCourses]);

  // Rafraîchit la liste des demandes disponibles pendant que l'écran est
  // actif, pour voir les nouvelles courses en temps quasi réel sans avoir à
  // quitter puis rouvrir l'app.
  useFocusEffect(
    useCallback(() => {
      chargerCourses();
      const intervalle = setInterval(chargerCourses, 5000);
      return () => clearInterval(intervalle);
    }, [chargerCourses])
  );

  async function toggleDisponibilite(valeur: boolean) {
    if (!coursier) return;
    await patchCoursier(coursier.id, { disponibilite: valeur });
    await refreshProfile();
  }

  async function accepter(course: Course) {
    if (!session) return;
    setErreur(null);
    try {
      await patchCourse(course.id, { statut: "acceptee", coursierId: session.user.id });
      router.push(`/(coursier)/course/${course.id}`);
    } catch {
      setErreur("Impossible d'accepter cette course. Elle a peut-être déjà été prise.");
      chargerCourses();
    }
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

  const afficherListe =
    coursier?.statutVerification === "valide" && coursier?.disponibilite && zonesDisponibilite.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <FlatList
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 32, gap: 12 }}
        data={afficherListe ? courses : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-4">
            <Pressable onPress={() => router.push("/(coursier)/profil")} className="mb-4 flex-row items-center gap-3">
              {utilisateur?.photoUrl ? (
                <Image source={{ uri: utilisateur.photoUrl }} className="h-12 w-12 rounded-full" />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-full bg-colimo-rouge-clair">
                  <Text className="font-titre text-colimo-rouge">
                    {(utilisateur?.prenom ?? utilisateur?.nom ?? "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="font-texte-medium text-colimo-neutre-fonce">
                  {utilisateur?.prenom ?? utilisateur?.nom ?? "Mon profil"}
                </Text>
                <Text className="font-texte text-xs text-colimo-neutre-fonce/50">Voir mon profil</Text>
              </View>
            </Pressable>

            <View className="mb-4 flex-row gap-3">
              <Carte className="flex-1">
                <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Gains cumulés</Text>
                <Text className="mt-1 font-titre text-base text-colimo-rouge">{formatFCFA(gains)}</Text>
              </Carte>
              <Carte className="flex-1">
                <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Note moyenne</Text>
                <Text className="mt-1 font-titre text-base text-colimo-neutre-fonce">
                  {coursier?.noteMoyenne ? `${coursier.noteMoyenne} / 5` : "—"}
                </Text>
              </Carte>
            </View>

            <Carte className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="font-texte-medium text-colimo-neutre-fonce">Disponible</Text>
                <Text className="font-texte text-xs text-colimo-neutre-fonce/60">
                  Zones : {zonesDisponibilite.length > 0 ? zonesDisponibilite.map((z) => ZONE_LABELS[z]).join(", ") : "Aucune zone sélectionnée"}
                </Text>
              </View>
              <Switch
                value={coursier?.disponibilite ?? false}
                onValueChange={toggleDisponibilite}
                disabled={coursier?.statutVerification !== "valide"}
              />
            </Carte>

            {erreur && <Text className="mt-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

            {coursier?.statutVerification !== "valide" ? (
              <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">
                Votre inscription est en cours de validation par COLIMO. Vous pourrez accepter des
                courses une fois validé·e.
              </Text>
            ) : !coursier?.disponibilite ? (
              <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">
                Passez disponible pour voir les courses de vos zones
              </Text>
            ) : zonesDisponibilite.length === 0 ? (
              <Pressable onPress={() => router.push("/(coursier)/profil")}>
                <Text className="mt-6 text-center font-texte text-sm text-colimo-rouge">
                  Ajoutez des zones couvertes dans votre profil pour voir des demandes
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          afficherListe ? (
            <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">
              Aucune course disponible pour l&apos;instant
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Carte>
            <Text className="font-texte-medium text-colimo-neutre-fonce">
              {item.adresseDepart} → {item.adresseArrivee}
            </Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">{item.typeColis}</Text>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="font-titre text-colimo-rouge">{formatFCFA(item.prix)}</Text>
              <Bouton label="Accepter" onPress={() => accepter(item)} className="px-6 py-2.5" />
            </View>
          </Carte>
        )}
        ListFooterComponent={
          <View className="mt-4">
            <Bouton
              label="Mes gains et notes"
              variante="contour"
              onPress={() => router.push("/(coursier)/historique")}
              className="py-3"
            />
            <Pressable onPress={() => router.push("/faq")} className="mt-3 py-2">
              <Text className="text-center font-texte text-sm text-colimo-neutre-fonce/60">FAQ</Text>
            </Pressable>
            <Pressable onPress={handleDeconnexion} className="mt-1 py-2">
              <Text className="text-center font-texte text-sm text-colimo-neutre-fonce/60">Se déconnecter</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}
