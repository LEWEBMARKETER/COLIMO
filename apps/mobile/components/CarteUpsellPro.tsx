import { Text, View } from "react-native";
import { router } from "expo-router";
import {
  CATALOGUE_FONCTIONNALITES_PREMIUM,
  PRIX_PACK,
  SUBSCRIPTION_PLAN_LABELS,
  formatFCFA,
  type CleFonctionnalitePremium,
} from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";

interface CarteUpsellProProps {
  cle: CleFonctionnalitePremium;
  pleinEcran?: boolean;
}

// Un seul composant pour verrouiller une fonctionnalité premium — le nom, la
// description, le palier requis et le prix viennent uniquement du catalogue
// (packages/shared/src/abonnements/types.ts), pour ne plus dupliquer cette
// copie écran par écran (destinataires/adresses/equipe/coursiers-favoris
// avaient chacun leur propre variante avant ce composant).
export default function CarteUpsellPro({ cle, pleinEcran = false }: CarteUpsellProProps) {
  const fonctionnalite = CATALOGUE_FONCTIONNALITES_PREMIUM.find((f) => f.cle === cle);
  if (!fonctionnalite) return null;
  const { nom, description, palierRequis } = fonctionnalite;
  const palierLabel = SUBSCRIPTION_PLAN_LABELS[palierRequis];

  return (
    <View className={pleinEcran ? "flex-1 items-center justify-center px-8" : undefined}>
      <Carte className={pleinEcran ? "w-full" : "mt-4"}>
        <Text
          className={
            pleinEcran
              ? "text-center font-titre text-lg text-colimo-neutre-fonce"
              : "font-texte-medium text-sm text-colimo-neutre-fonce"
          }
        >
          🔒 Disponible avec COLIMO PRO {palierLabel.toUpperCase()}
        </Text>
        <Text
          className={
            pleinEcran
              ? "mt-2 text-center font-texte text-sm text-colimo-neutre-fonce/60"
              : "mt-1 font-texte text-xs text-colimo-neutre-fonce/60"
          }
        >
          {nom} — {description}
        </Text>
        <Text
          className={
            pleinEcran
              ? "mt-3 text-center font-texte-medium text-sm text-colimo-rouge"
              : "mt-2 font-texte-medium text-xs text-colimo-rouge"
          }
        >
          {formatFCFA(PRIX_PACK[palierRequis])} / mois
        </Text>
        <Bouton
          label={`Passer à ${palierLabel}`}
          onPress={() => router.push(`/(client)/commerce/decouvrir?feature=${cle}`)}
          variante={pleinEcran ? "primaire" : "contour"}
          className={pleinEcran ? "mt-5" : "mt-3"}
        />
      </Carte>
    </View>
  );
}
