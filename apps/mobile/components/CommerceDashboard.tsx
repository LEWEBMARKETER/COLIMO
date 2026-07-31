import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { formatFCFA, type Course, type CoursierAvecUtilisateur } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import { getCoursiers, getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const STATUTS_EN_COURS = new Set(["en_attente", "acceptee", "retrait", "en_cours"]);
const STATUTS_TERMINEES = new Set(["livree", "confirmee"]);

function estAujourdhui(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function CommerceDashboard() {
  const { session, utilisateur } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursiers, setCoursiers] = useState<CoursierAvecUtilisateur[]>([]);

  useEffect(() => {
    if (!session) return;
    getCourses({ clientId: session.user.id }).then(setCourses);
    getCoursiers().then(setCoursiers);
  }, [session]);

  const coursesJour = courses.filter((c) => estAujourdhui(c.createdAt));
  const enCours = courses.filter((c) => STATUTS_EN_COURS.has(c.statut)).length;
  const terminees = courses.filter((c) => STATUTS_TERMINEES.has(c.statut)).length;
  const depensesJour = coursesJour.filter((c) => c.statut !== "annulee").reduce((s, c) => s + c.prix, 0);

  const coursCoursier = new Map<string, number>();
  courses
    .filter((c) => c.coursierId && c.statut === "confirmee")
    .forEach((c) => coursCoursier.set(c.coursierId as string, (coursCoursier.get(c.coursierId as string) ?? 0) + 1));
  const favoris = [...coursCoursier.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([utilisateurId, nombre]) => {
      const coursier = coursiers.find((c) => c.utilisateurId === utilisateurId);
      const nom = coursier ? (coursier.utilisateur.prenom ?? coursier.utilisateur.nom) : "Coursier";
      return { nom, nombre };
    });

  return (
    <View>
      <Text className="font-titre text-xl text-colimo-neutre-fonce">
        Bonjour {utilisateur?.nom ?? ""} 👋
      </Text>
      <Text className="mt-0.5 font-texte text-sm text-colimo-neutre-fonce/70">Vue d&apos;ensemble du jour</Text>

      <View className="mt-4 flex-row flex-wrap gap-3">
        <Carte className="min-w-[47%] flex-1">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Livraisons du jour</Text>
          <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{coursesJour.length}</Text>
        </Carte>
        <Carte className="min-w-[47%] flex-1">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">En cours</Text>
          <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{enCours}</Text>
        </Carte>
        <Carte className="min-w-[47%] flex-1">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Terminées</Text>
          <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{terminees}</Text>
        </Carte>
        <Carte className="min-w-[47%] flex-1">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Dépenses du jour</Text>
          <Text className="mt-1 font-titre text-lg text-colimo-rouge">{formatFCFA(depensesJour)}</Text>
        </Carte>
      </View>

      <Carte className="mt-3">
        <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Coursiers favoris</Text>
        {favoris.length === 0 ? (
          <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/50">
            Pas encore assez de livraisons confirmées
          </Text>
        ) : (
          favoris.map((f) => (
            <View key={f.nom} className="mt-1 flex-row items-center justify-between">
              <Text className="font-texte text-sm text-colimo-neutre-fonce">{f.nom}</Text>
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">{f.nombre} livraison(s)</Text>
            </View>
          ))
        )}
      </Carte>

      <View className="mt-6">
        <Bouton label="Nouvelle livraison" onPress={() => router.push("/(client)/nouvelle-livraison")} />
        <Bouton
          label="Historique"
          variante="contour"
          onPress={() => router.push("/(client)/historique")}
          className="mt-3"
        />
        <Bouton
          label="Mes statistiques"
          variante="contour"
          onPress={() => router.push("/(client)/mes-statistiques")}
          className="mt-3"
        />
      </View>
    </View>
  );
}
