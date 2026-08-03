import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatFCFA, type Course, type CoursierAvecUtilisateur } from "@colimo/shared";
import Carte from "@/components/ui/Carte";
import { getCoursiers, getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

function estCeMois(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function MesStatistiquesScreen() {
  const { session } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursiers, setCoursiers] = useState<CoursierAvecUtilisateur[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([getCourses({ clientId: session.user.id }), getCoursiers()])
      .then(([c, cr]) => {
        setCourses(c);
        setCoursiers(cr);
      })
      .finally(() => setChargement(false));
  }, [session]);

  if (chargement) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  const coursesMois = courses.filter((c) => estCeMois(c.createdAt) && c.statut !== "annulee");
  const coutMensuel = coursesMois.reduce((s, c) => s + c.prix, 0);

  const confirmees = courses.filter((c) => c.statut === "confirmee");
  const annuleesOuRetournees = courses.filter((c) => c.statut === "annulee" || c.statut === "retournee");
  const totalTerminales = confirmees.length + annuleesOuRetournees.length;
  const tauxReussite = totalTerminales > 0 ? Math.round((confirmees.length / totalTerminales) * 100) : null;

  const durees = confirmees
    .filter((c) => c.accepteeAt && c.livreeAt)
    .map((c) => (new Date(c.livreeAt as string).getTime() - new Date(c.accepteeAt as string).getTime()) / 60000);
  const delaiMoyen = durees.length > 0 ? Math.round(durees.reduce((s, d) => s + d, 0) / durees.length) : null;

  const coursCoursier = new Map<string, number>();
  courses
    .filter((c) => c.coursierId && c.statut === "confirmee")
    .forEach((c) => coursCoursier.set(c.coursierId as string, (coursCoursier.get(c.coursierId as string) ?? 0) + 1));
  const topCoursiers = [...coursCoursier.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([utilisateurId, nombre]) => {
      const coursier = coursiers.find((c) => c.utilisateurId === utilisateurId);
      const nom = coursier ? (coursier.utilisateur.prenom ?? coursier.utilisateur.nom) : "Coursier";
      return { nom, nombre };
    });

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="mb-4 font-titre text-lg text-colimo-neutre-fonce">Mes statistiques</Text>

        <View className="flex-row flex-wrap gap-3">
          <Carte className="min-w-[47%] flex-1">
            <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Nombre de livraisons</Text>
            <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{courses.length}</Text>
          </Carte>
          <Carte className="min-w-[47%] flex-1">
            <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Coût du mois</Text>
            <Text className="mt-1 font-titre text-lg text-colimo-rouge">{formatFCFA(coutMensuel)}</Text>
          </Carte>
          <Carte className="min-w-[47%] flex-1">
            <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Délai moyen</Text>
            <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">
              {delaiMoyen !== null ? `${delaiMoyen} min` : "—"}
            </Text>
          </Carte>
          <Carte className="min-w-[47%] flex-1">
            <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Taux de réussite</Text>
            <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">
              {tauxReussite !== null ? `${tauxReussite}%` : "—"}
            </Text>
          </Carte>
        </View>

        <Carte className="mt-3">
          <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">Coursiers les plus utilisés</Text>
          {topCoursiers.length === 0 ? (
            <Text className="font-texte text-sm text-colimo-neutre-fonce/50">Pas encore de livraison confirmée</Text>
          ) : (
            topCoursiers.map((c) => (
              <View key={c.nom} className="mt-1 flex-row items-center justify-between">
                <Text className="font-texte text-sm text-colimo-neutre-fonce">{c.nom}</Text>
                <Text className="font-texte text-xs text-colimo-neutre-fonce/60">{c.nombre} livraison(s)</Text>
              </View>
            ))
          )}
        </Carte>
      </ScrollView>
    </SafeAreaView>
  );
}
