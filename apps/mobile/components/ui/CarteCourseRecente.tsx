import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import StatutChip from "@/components/ui/StatutChip";

interface CarteCourseRecenteProps {
  course: Course;
  onRefaire?: () => void;
}

// Carte compacte pour "Vos dernières livraisons" (Home) — numéro, date,
// trajet, statut, montant, et éventuellement "Refaire" (commerce uniquement
// pour l'instant : seul /(client)/nouvelle-livraison sait préremplir depuis
// une course existante, cf. depuisCourseId).
export default function CarteCourseRecente({ course, onRefaire }: CarteCourseRecenteProps) {
  return (
    <Pressable
      onPress={() => router.push(`/(client)/track/${course.id}`)}
      className="mr-3 w-64 rounded-2xl border border-colimo-neutre-clair bg-white p-4"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">{course.codeSuivi}</Text>
        <StatutChip statut={course.statut} intensite="douce" />
      </View>
      <Text className="mt-2 font-texte-medium text-sm text-colimo-neutre-fonce" numberOfLines={1}>
        {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
      </Text>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
          {new Date(course.createdAt).toLocaleDateString("fr-FR")}
        </Text>
        <Text className="font-titre text-sm text-colimo-rouge">{formatFCFA(course.prix)}</Text>
      </View>
      {onRefaire && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onRefaire();
          }}
          hitSlop={8}
          className="mt-3 self-start"
        >
          <Text className="font-texte-medium text-xs text-colimo-rouge">↻ Refaire</Text>
        </Pressable>
      )}
    </Pressable>
  );
}
