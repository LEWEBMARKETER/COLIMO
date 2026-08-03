import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { formatFCFA, ZONE_LABELS, type Course, type Zone } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import { getCourses, patchCoursier, patchCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { notifierEvenement } from "@/lib/notifications";

export default function CoursierDashboard() {
  const { session, utilisateur, coursier, refreshProfile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [gainsNets, setGainsNets] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getCourses({ coursierId: session.user.id }).then((mesCourses) => {
      const confirmees = mesCourses.filter((c) => c.statut === "confirmee");
      setGainsNets(confirmees.reduce((s, c) => s + (c.prix - c.commission), 0));
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
      await notifierEvenement("coursier_attribue", {
        declenchePar: session.user.id,
        destinataire: course.telephoneDestinataire,
        variables: {
          nom_client: course.nomDestinataire ?? "client",
          numero_commande: course.numeroCommande,
          nom_coursier: utilisateur?.prenom ?? utilisateur?.nom ?? "votre coursier",
          telephone: utilisateur?.telephone ?? "",
        },
      });
      router.push(`/(coursier)/course/${course.id}`);
    } catch {
      setErreur("Impossible d'accepter cette course. Elle a peut-être déjà été prise.");
      chargerCourses();
    }
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
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 28, gap: 12 }}
        data={afficherListe ? courses : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-5">
            <Text className="font-texte text-sm text-colimo-neutre-fonce/60">
              Bonjour {utilisateur?.prenom ?? utilisateur?.nom ?? ""}
            </Text>

            {/* Chiffre-clé du jour, traitement éditorial : le nombre porte
                l'information, la légende reste discrète. */}
            <View className="mt-2 flex-row items-end justify-between border-b-2 border-colimo-neutre-fonce pb-3">
              <View>
                <Text className="font-titre-bold text-3xl text-colimo-neutre-fonce" style={{ fontVariant: ["tabular-nums"] }}>
                  {formatFCFA(gainsNets)}
                </Text>
                <Text className="mt-1 font-texte-medium text-[11px] uppercase tracking-wide text-colimo-neutre-fonce/50">
                  Gains nets cumulés
                </Text>
              </View>
              <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                {courses.length} course{courses.length > 1 ? "s" : ""} dispo
              </Text>
            </View>

            <View className="mt-4 flex-row items-center justify-between rounded-lg border-2 border-colimo-neutre-fonce bg-white px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className="font-texte-medium text-colimo-neutre-fonce">Disponible</Text>
                <Text className="font-texte text-xs text-colimo-neutre-fonce/60">
                  {zonesDisponibilite.length > 0 ? zonesDisponibilite.map((z) => ZONE_LABELS[z]).join(", ") : "Aucune zone sélectionnée"}
                </Text>
              </View>
              <Switch
                value={coursier?.disponibilite ?? false}
                onValueChange={toggleDisponibilite}
                disabled={coursier?.statutVerification !== "valide"}
                trackColor={{ true: "#C41E24" }}
              />
            </View>

            {erreur && <Text className="mt-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

            {coursier?.statutVerification !== "valide" ? (
              <Text className="mt-5 text-center font-texte text-colimo-neutre-fonce/60">
                Ton inscription est en cours de validation par COLIMO. Tu pourras accepter des
                courses une fois validé·e.
              </Text>
            ) : !coursier?.disponibilite ? (
              <Text className="mt-5 text-center font-texte text-colimo-neutre-fonce/60">
                Passe disponible pour voir les courses de tes zones
              </Text>
            ) : zonesDisponibilite.length === 0 ? (
              <Text
                onPress={() => router.push("/(coursier)/profil")}
                className="mt-5 text-center font-texte text-sm text-colimo-rouge"
              >
                Ajoute des zones couvertes dans ton profil pour voir des demandes
              </Text>
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
          <View className="rounded-lg border-2 border-colimo-neutre-fonce bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
                {ZONE_LABELS[item.zoneDepart]} → {ZONE_LABELS[item.zoneArrivee]}
              </Text>
              <Text
                className="font-titre-bold text-xl text-colimo-neutre-fonce"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatFCFA(item.prix)}
              </Text>
            </View>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70" numberOfLines={1}>
              {item.adresseDepart} → {item.adresseArrivee}
            </Text>
            <Bouton label="Accepter cette course" onPress={() => accepter(item)} className="mt-3 py-3.5" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
