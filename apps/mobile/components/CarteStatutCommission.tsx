import { Text, View } from "react-native";
import { calculerProgressionPalier, type PalierCommission, type PerformanceMensuelleCoursier } from "@colimo/shared";
import Carte from "@/components/ui/Carte";
import ChiffreCle from "@/components/ui/ChiffreCle";

interface CarteStatutCommissionProps {
  performance: PerformanceMensuelleCoursier | null;
  paliers: PalierCommission[];
}

// Couleurs par code de palier — pas de colonne "couleur" en base
// (contrairement à catalogue_niveaux) : ces 4 codes sont fixes (grille de
// la mission), la couleur reste un choix d'affichage, pas une donnée métier.
const COULEURS_PALIER: Record<string, string> = {
  standard: "#94A3B8",
  actif: "#1D4ED8",
  pro: "#B08D57",
  elite: "#D4AF37",
};

/**
 * "MON STATUT COLIMO" (besoin section 6) — progression du coursier vers le
 * prochain palier de commission dans le mois en cours. Composants
 * réutilisés : Carte (variante sombre+degrade, réservée aux chiffres-clés
 * mis en avant), ChiffreCle — aucun composant recréé à la main. Dégradation
 * silencieuse (retourne null) si la grille n'est pas encore configurée :
 * une carte secondaire ne doit jamais bloquer le tableau de bord.
 */
export default function CarteStatutCommission({ performance, paliers }: CarteStatutCommissionProps) {
  if (paliers.length === 0) return null;

  const coursesEligibles = performance?.coursesEligibles ?? 0;
  const { palierActuel, prochainPalier, coursesRestantes } = calculerProgressionPalier(coursesEligibles, paliers);
  if (!palierActuel) return null;

  const couleur = COULEURS_PALIER[palierActuel.code] ?? "#94A3B8";
  const icone = palierActuel.code === "elite" ? "🏆" : "🏷";
  const tauxPourcent = Math.round(palierActuel.taux * 100);

  const plageCourante = palierActuel.seuilMax !== null ? palierActuel.seuilMax - palierActuel.seuilMin + 1 : null;
  const progression =
    plageCourante && plageCourante > 0
      ? Math.min(Math.max((coursesEligibles - palierActuel.seuilMin) / plageCourante, 0), 1)
      : 1;

  return (
    <Carte sombre degrade className="mb-5">
      <View className="flex-row items-center justify-between">
        <Text className="font-texte-medium text-xs uppercase tracking-wide text-white/60">Mon statut COLIMO</Text>
        <View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1" style={{ backgroundColor: couleur }}>
          <Text className="font-titre text-xs uppercase tracking-wide text-white">
            {icone} {palierActuel.nom}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-end justify-between">
        <ChiffreCle sombre valeur={String(coursesEligibles)} label="📦 Courses ce mois" taille="grand" />
        <ChiffreCle sombre valeur={`${tauxPourcent}%`} label="💰 Commission actuelle" taille="moyen" />
      </View>

      <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
        <View className="h-full rounded-full" style={{ width: `${progression * 100}%`, backgroundColor: couleur }} />
      </View>

      <Text className="mt-3 font-texte text-xs text-white/70">
        {prochainPalier && coursesRestantes !== null
          ? `🎯 Plus que ${coursesRestantes} course${coursesRestantes > 1 ? "s" : ""} pour devenir ${prochainPalier.nom} et passer à ${Math.round(
              prochainPalier.taux * 100
            )}% de commission.`
          : "Vous avez atteint le meilleur taux COLIMO."}
      </Text>
    </Carte>
  );
}
