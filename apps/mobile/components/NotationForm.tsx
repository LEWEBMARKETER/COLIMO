import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import StarRating from "./StarRating";
import { creerNotation, getNotations } from "@/lib/api";

interface NotationFormProps {
  courseId: string;
  auteurId: string;
  destinataireId: string;
  titre: string;
}

export default function NotationForm({ courseId, auteurId, destinataireId, titre }: NotationFormProps) {
  const [chargement, setChargement] = useState(true);
  const [dejaNote, setDejaNote] = useState(false);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    getNotations(courseId)
      .then((notations) => setDejaNote(notations.some((n) => n.auteurId === auteurId)))
      .finally(() => setChargement(false));
  }, [courseId, auteurId]);

  async function envoyer() {
    if (note === 0) return;
    setEnvoiEnCours(true);
    try {
      await creerNotation({ courseId, auteurId, destinataireId, note, commentaire: commentaire.trim() || undefined });
      setDejaNote(true);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (chargement) {
    return (
      <View className="mt-6 items-center rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <ActivityIndicator color="#C41E24" />
      </View>
    );
  }

  if (dejaNote) {
    return (
      <View className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <Text className="text-colimo-neutre-fonce">Merci, votre avis a bien été envoyé.</Text>
      </View>
    );
  }

  return (
    <View className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
      <Text className="font-titre font-semibold text-colimo-neutre-fonce">{titre}</Text>
      <View className="mt-3">
        <StarRating value={note} onChange={setNote} />
      </View>
      <TextInput
        value={commentaire}
        onChangeText={setCommentaire}
        placeholder="Un commentaire (optionnel)"
        multiline
        className="mt-3 min-h-[60px] rounded-xl border border-colimo-neutre-clair px-4 py-3 text-colimo-neutre-fonce"
      />
      <Pressable
        disabled={note === 0 || envoiEnCours}
        onPress={envoyer}
        className={`mt-3 rounded-xl py-3 ${note === 0 ? "bg-colimo-neutre-clair" : "bg-colimo-rouge"}`}
      >
        <Text className={`text-center font-semibold ${note === 0 ? "text-colimo-neutre-fonce/50" : "text-white"}`}>
          Envoyer la note
        </Text>
      </Pressable>
    </View>
  );
}
