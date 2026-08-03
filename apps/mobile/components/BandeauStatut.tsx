import { Text, View } from "react-native";
import { COURSE_STATUS_LABELS, type CourseStatus } from "@colimo/shared";
import { TEINTES_STATUT } from "@/components/ui/StatutChip";

interface BandeauStatutProps {
  statut: CourseStatus;
  numeroCommande: string;
}

/**
 * Bandeau de statut plein-largeur — le statut se lit d'un regard, sans avoir
 * à chercher une petite pastille. Réservé aux écrans à fort enjeu terrain
 * (course active, suivi de course), là où la lisibilité prime sur la
 * discrétion.
 */
export default function BandeauStatut({ statut, numeroCommande }: BandeauStatutProps) {
  const teinte = TEINTES_STATUT[statut];
  return (
    <View style={{ backgroundColor: teinte.forte }} className="flex-row items-baseline justify-between px-6 py-4">
      <Text className="font-titre-bold text-lg text-white">{COURSE_STATUS_LABELS[statut]}</Text>
      <Text className="font-texte-medium text-xs text-white/75">{numeroCommande}</Text>
    </View>
  );
}
