import { Text, View } from "react-native";
import { COURSE_STATUS_LABELS, type CourseStatus } from "@colimo/shared";

interface Teinte {
  forte: string;
  douceFond: string;
  douceTexte: string;
}

// Même vocabulaire de couleur que StatutBadge côté admin (apps/admin/components/StatutBadge.tsx) :
// un statut se lit de la même façon des deux côtés de la plateforme.
export const TEINTES_STATUT: Record<CourseStatus, Teinte> = {
  en_attente_paiement: { forte: "#9E1419", douceFond: "#FBE7E7", douceTexte: "#9E1419" },
  en_attente: { forte: "#B45309", douceFond: "#FEF3C7", douceTexte: "#92400E" },
  acceptee: { forte: "#1D4ED8", douceFond: "#DBEAFE", douceTexte: "#1E40AF" },
  retrait: { forte: "#B45309", douceFond: "#FEF3C7", douceTexte: "#92400E" },
  en_cours: { forte: "#1D4ED8", douceFond: "#DBEAFE", douceTexte: "#1E40AF" },
  livree: { forte: "#4338CA", douceFond: "#E0E7FF", douceTexte: "#3730A3" },
  confirmee: { forte: "#047857", douceFond: "#D1FAE5", douceTexte: "#065F46" },
  annulee: { forte: "#57534E", douceFond: "#F1EDEA", douceTexte: "#44403C" },
  litige: { forte: "#9E1419", douceFond: "#FBE7E7", douceTexte: "#9E1419" },
  retournee: { forte: "#C2410C", douceFond: "#FFEDD5", douceTexte: "#9A3412" },
};

interface StatutChipProps {
  statut: CourseStatus;
  intensite?: "forte" | "douce";
  label?: string;
}

/**
 * Puce de statut de course — deux intensités selon l'enjeu de l'écran :
 * "forte" (aplat plein, lisible d'un regard) pour les écrans terrain
 * (course active, liste de courses disponibles), "douce" (pastille pastel)
 * pour les écrans de navigation quotidienne (historique, listes longues).
 */
export default function StatutChip({ statut, intensite = "douce", label }: StatutChipProps) {
  const teinte = TEINTES_STATUT[statut];
  const texte = label ?? COURSE_STATUS_LABELS[statut];

  if (intensite === "forte") {
    return (
      <View style={{ backgroundColor: teinte.forte }} className="self-start rounded-md px-3 py-1.5">
        <Text className="font-titre text-xs uppercase tracking-wide text-white">{texte}</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: teinte.douceFond }} className="self-start rounded-full px-3 py-1">
      <Text style={{ color: teinte.douceTexte }} className="font-texte-medium text-xs">
        {texte}
      </Text>
    </View>
  );
}
