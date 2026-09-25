import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { formatDureeSecondes, formatFCFA, type Course, type CourseStatus, type CoursierAvecUtilisateur } from "@colimo/shared";
import GroupePastilles from "@/components/ui/GroupePastilles";
import StatutChip from "@/components/ui/StatutChip";
import { getCoursiers, getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

type Filtre =
  | "toutes"
  | "aujourdhui"
  | "demain"
  | "programmees"
  | "semaine"
  | "mois"
  | "en_attente"
  | "en_cours"
  | "livrees"
  | "annulees"
  | "problemes";

const FILTRES: { valeur: Filtre; label: string }[] = [
  { valeur: "toutes", label: "Toutes" },
  { valeur: "aujourdhui", label: "Aujourd'hui" },
  { valeur: "demain", label: "Demain" },
  { valeur: "programmees", label: "Programmées" },
  { valeur: "semaine", label: "Cette semaine" },
  { valeur: "mois", label: "Ce mois" },
  { valeur: "en_attente", label: "En attente" },
  { valeur: "en_cours", label: "En cours" },
  { valeur: "livrees", label: "Livrées" },
  { valeur: "annulees", label: "Annulées" },
  { valeur: "problemes", label: "Problèmes" },
];

const STATUTS_PAR_FILTRE: Partial<Record<Filtre, CourseStatus[]>> = {
  en_attente: ["en_attente_paiement", "en_attente"],
  en_cours: ["acceptee", "retrait", "en_cours"],
  livrees: ["livree", "confirmee"],
  annulees: ["annulee", "retournee"],
  problemes: ["litige", "echouee"],
};

// Date effective d'une course pour les filtres de planning : la date/heure
// programmée si elle existe, sinon la date de création (course immédiate).
function dateEffective(course: Course): Date {
  return new Date(course.programmeePour ?? course.createdAt);
}

function memeJour(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function estAujourdhui(course: Course): boolean {
  return memeJour(dateEffective(course), new Date());
}

function estDemain(course: Course): boolean {
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  return memeJour(dateEffective(course), demain);
}

function estCetteSemaine(dateIso: string): boolean {
  const d = new Date(dateIso);
  const debutSemaine = new Date();
  const jour = (debutSemaine.getDay() + 6) % 7; // lundi = 0
  debutSemaine.setDate(debutSemaine.getDate() - jour);
  debutSemaine.setHours(0, 0, 0, 0);
  return d >= debutSemaine;
}

function estCeMois(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function HistoriqueCommerce() {
  const { session } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursiers, setCoursiers] = useState<CoursierAvecUtilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  useEffect(() => {
    if (!session) return;
    Promise.all([getCourses({ clientId: session.user.id }), getCoursiers()])
      .then(([c, cr]) => {
        setCourses(c);
        setCoursiers(cr);
      })
      .finally(() => setChargement(false));
  }, [session]);

  const nomCoursier = useMemo(() => {
    const parId = new Map(coursiers.map((c) => [c.utilisateurId, [c.utilisateur.prenom, c.utilisateur.nom].filter(Boolean).join(" ")]));
    return (coursierId: string | null) => (coursierId ? (parId.get(coursierId) ?? "Coursier") : null);
  }, [coursiers]);

  const FILTRES_DATE = new Set<Filtre>(["aujourdhui", "demain", "programmees", "semaine", "mois"]);
  const coursesFiltrees = courses
    .filter((c) => (filtre === "toutes" || FILTRES_DATE.has(filtre) ? true : STATUTS_PAR_FILTRE[filtre]?.includes(c.statut)))
    .filter((c) => {
      switch (filtre) {
        case "aujourdhui":
          return estAujourdhui(c);
        case "demain":
          return estDemain(c);
        case "programmees":
          return c.programmeePour !== null && new Date(c.programmeePour) > new Date();
        case "semaine":
          return estCetteSemaine(c.createdAt);
        case "mois":
          return estCeMois(c.createdAt);
        default:
          return true;
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (chargement) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator color="#C41E24" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Text className="mb-3 font-titre text-2xl text-colimo-neutre-fonce">Mes livraisons</Text>

      <GroupePastilles label="Filtrer" options={FILTRES} value={filtre} onChange={setFiltre} defilement className="mb-1" />

      <FlatList
        data={coursesFiltrees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">Aucune livraison pour ce filtre</Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(client)/track/${item.id}`)}>
            <View className="rounded-2xl bg-white p-4 shadow-sm">
              <View className="flex-row items-center justify-between">
                <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">{item.numeroCommande}</Text>
                <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                  {new Date(item.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>

              {item.nomDestinataire && (
                <Text className="mt-1 font-texte-medium text-colimo-neutre-fonce">{item.nomDestinataire}</Text>
              )}
              <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/60" numberOfLines={1}>
                → {item.adresseArrivee}
              </Text>
              <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/50">
                {item.coursierId ? `Coursier : ${nomCoursier(item.coursierId)}` : "Coursier non attribué"}
              </Text>

              <View className="mt-2.5 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text className="font-titre text-colimo-rouge">{formatFCFA(item.prix)}</Text>
                  {item.etaSecondes != null && (
                    <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                      ETA ~{formatDureeSecondes(item.etaSecondes)}
                    </Text>
                  )}
                </View>
                <StatutChip statut={item.statut} intensite="douce" />
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
