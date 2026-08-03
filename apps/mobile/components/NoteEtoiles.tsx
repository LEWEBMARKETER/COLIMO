import { Text, View } from "react-native";

interface NoteEtoilesProps {
  note: number;
  taille?: number;
  afficherValeur?: boolean;
}

export default function NoteEtoiles({ note, taille = 16, afficherValeur = true }: NoteEtoilesProps) {
  const noteArrondie = Math.round(note);
  return (
    <View className="flex-row items-center gap-1">
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((etoile) => (
          <Text
            key={etoile}
            style={{ fontSize: taille }}
            className={etoile <= noteArrondie ? "text-colimo-rouge" : "text-colimo-neutre-clair"}
          >
            ★
          </Text>
        ))}
      </View>
      {afficherValeur && (
        <Text className="font-texte text-xs text-colimo-neutre-fonce/60">{note > 0 ? note.toFixed(1) : "—"}</Text>
      )}
    </View>
  );
}
