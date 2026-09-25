import { Text } from "react-native";

interface VariationBadgeProps {
  // Ratio signé (0.2 = +20%), ou null quand il n'y a rien à comparer (pas
  // de donnée sur la période précédente) — dans ce cas, n'affiche rien
  // plutôt qu'un +100%/+∞ trompeur.
  valeur: number | null;
  // Pour une dépense, une hausse n'est pas une bonne nouvelle : inverse la
  // lecture des couleurs (hausse en rouge, baisse en vert) sans changer le
  // signe affiché.
  inverse?: boolean;
}

// Petit badge "+12% / -8% vs mois dernier", réutilisé partout où une
// statistique se compare à la période précédente (tableau de bord commerce,
// statistiques). Une seule façon de présenter une variation dans l'app.
export default function VariationBadge({ valeur, inverse = false }: VariationBadgeProps) {
  if (valeur === null) return null;

  const positif = inverse ? valeur <= 0 : valeur >= 0;
  const pourcentage = Math.round(Math.abs(valeur) * 100);

  return (
    <Text className={`mt-0.5 font-texte-medium text-[11px] ${positif ? "text-emerald-600" : "text-colimo-rouge"}`}>
      {valeur >= 0 ? "+" : "-"}
      {pourcentage}% vs mois dernier
    </Text>
  );
}
