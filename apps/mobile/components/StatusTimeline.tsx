import { Text, View } from "react-native";
import { COURSE_STATUS_LABELS, type Course, type CourseStatus } from "@colimo/shared";

// Pick plutôt que Course entier : réutilisé aussi par l'écran de suivi
// public (destinataire sans compte), qui ne reçoit qu'une vue réduite de la
// course (packages/shared/src/suivi/types.ts) — pas de prix/paiement/etc.
type CourseAvecEtapes = Pick<Course, "statut" | "createdAt" | "accepteeAt" | "recupereeAt" | "livreeAt" | "confirmeeAt">;

const ETAPES: CourseStatus[] = ["en_attente", "acceptee", "retrait", "en_cours", "livree", "confirmee"];

function formatHeure(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuree(debutMs: number, finMs: number): string {
  const minutes = Math.max(0, Math.round((finMs - debutMs) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return `${heures} h${reste ? ` ${reste} min` : ""}`;
}

function timestampEtape(course: CourseAvecEtapes, etape: CourseStatus): string | null {
  switch (etape) {
    case "en_attente":
      return course.createdAt;
    case "acceptee":
      return course.accepteeAt;
    case "retrait":
      return course.recupereeAt;
    case "livree":
      return course.livreeAt;
    case "confirmee":
      return course.confirmeeAt;
    default:
      return null;
  }
}

export default function StatusTimeline({ course }: { course: CourseAvecEtapes }) {
  const indexActuel = ETAPES.indexOf(course.statut);
  const debut = new Date(course.createdAt).getTime();
  const fin = course.confirmeeAt
    ? new Date(course.confirmeeAt).getTime()
    : course.livreeAt
      ? new Date(course.livreeAt).getTime()
      : Date.now();

  const dureeLabel =
    course.statut === "confirmee"
      ? `Durée totale : ${formatDuree(debut, fin)}`
      : indexActuel > 0
        ? `En cours depuis ${formatDuree(debut, fin)}`
        : null;

  return (
    <View>
      {dureeLabel && (
        <Text className="mb-3 font-texte-medium text-xs text-colimo-neutre-fonce/60">{dureeLabel}</Text>
      )}
      {ETAPES.map((etape, index) => {
        const atteinte = indexActuel >= 0 && index <= indexActuel;
        const heure = atteinte ? formatHeure(timestampEtape(course, etape)) : null;
        return (
          <View key={etape} className="flex-row items-center">
            <View className="items-center">
              <View
                className={`h-3 w-3 rounded-full ${atteinte ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"}`}
              />
              {index < ETAPES.length - 1 && (
                <View className={`h-8 w-0.5 ${atteinte ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"}`} />
              )}
            </View>
            <View className="ml-3 flex-1 flex-row items-center justify-between pb-8">
              <Text
                className={`text-sm ${
                  atteinte ? "font-texte-medium text-colimo-neutre-fonce" : "font-texte text-colimo-neutre-fonce/50"
                }`}
              >
                {COURSE_STATUS_LABELS[etape]}
              </Text>
              {heure && <Text className="font-texte text-xs text-colimo-neutre-fonce/50">{heure}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
