import { Pressable, Text, View } from "react-native";
import { CATEGORIE_COLIS_EMOJIS, ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";

interface CourseDisponibleCardProps {
  course: Course;
  onVoirDetails: () => void;
  onAccepter: () => void;
  // Course dans la zone principale du coursier (utilisateur.zone) — mise en
  // avant purement indicative, le pool et l'ordre d'acceptation restent
  // inchangés (premier arrivé premier servi).
  recommandee?: boolean;
}

export default function CourseDisponibleCard({
  course,
  onVoirDetails,
  onAccepter,
  recommandee = false,
}: CourseDisponibleCardProps) {
  return (
    <View className="rounded-lg border-2 border-colimo-neutre-fonce bg-white p-4">
      <Pressable onPress={onVoirDetails}>
        <View className="flex-row items-center justify-between">
          <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
            {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
          </Text>
          <Text className="font-titre-bold text-xl text-colimo-neutre-fonce" style={{ fontVariant: ["tabular-nums"] }}>
            {formatFCFA(course.prix)}
          </Text>
        </View>
        <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70" numberOfLines={1}>
          {course.adresseDepart} → {course.adresseArrivee}
        </Text>
        <View className="mt-1 flex-row items-center">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
            {CATEGORIE_COLIS_EMOJIS[course.categorieColis]} {course.typeColis}
          </Text>
          {course.livraisonPrioritaire && (
            <Text className="ml-2 rounded-full bg-colimo-rouge-clair px-2 py-0.5 text-xs font-medium text-colimo-rouge">
              Prioritaire
            </Text>
          )}
          {recommandee && (
            <Text className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ★ Pour vous
            </Text>
          )}
        </View>
      </Pressable>

      <View className="mt-3 flex-row gap-2">
        <Bouton label="Voir les détails" variante="contour" onPress={onVoirDetails} className="flex-1 py-3.5" />
        <Bouton label="Accepter" onPress={onAccepter} className="flex-1 py-3.5" />
      </View>
    </View>
  );
}
