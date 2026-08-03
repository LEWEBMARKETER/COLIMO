import { Text, View } from "react-native";

interface ChiffreCleProps {
  valeur: string;
  label: string;
  sombre?: boolean;
  taille?: "grand" | "moyen";
}

/**
 * Présentation "gros chiffre + légende" pour toute donnée-clé (prix,
 * chiffre d'affaires, gains...) — une seule façon, dans toute l'app, de
 * mettre en avant un montant important.
 */
export default function ChiffreCle({ valeur, label, sombre = false, taille = "grand" }: ChiffreCleProps) {
  return (
    <View>
      <Text
        className={`font-titre-bold ${taille === "grand" ? "text-3xl" : "text-xl"} ${
          sombre ? "text-white" : "text-colimo-neutre-fonce"
        }`}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {valeur}
      </Text>
      <Text
        className={`mt-1 font-texte-medium text-[10px] uppercase tracking-wide ${
          sombre ? "text-white/60" : "text-colimo-neutre-fonce/50"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
