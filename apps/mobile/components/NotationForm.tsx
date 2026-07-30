import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import StarRating from "./StarRating";
import Bouton from "./ui/Bouton";
import Carte from "./ui/Carte";
import { creerNotation, getNotations } from "@/lib/api";

interface NotationFormProps {
  courseId: string;
  auteurId: string;
  destinataireId: string;
  titre: string;
  onEnvoye?: () => void;
}

export default function NotationForm({ courseId, auteurId, destinataireId, titre, onEnvoye }: NotationFormProps) {
  const [chargement, setChargement] = useState(true);
  const [dejaNote, setDejaNote] = useState(false);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    getNotations(courseId)
      .then((notations) => setDejaNote(notations.some((n) => n.auteurId === auteurId)))
      .finally(() => setChargement(false));
  }, [courseId, auteurId]);

  async function envoyer() {
    if (note === 0) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      await creerNotation({ courseId, auteurId, destinataireId, note, commentaire: commentaire.trim() || undefined });
      setDejaNote(true);
      onEnvoye?.();
    } catch {
      setErreur("Impossible d'envoyer votre avis. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (chargement) {
    return (
      <Carte className="mt-6 items-center p-5">
        <ActivityIndicator color="#C41E24" />
      </Carte>
    );
  }

  if (dejaNote) {
    return (
      <Carte className="mt-6 p-5">
        <Text className="font-texte text-colimo-neutre-fonce">Merci, votre avis a bien été envoyé.</Text>
      </Carte>
    );
  }

  return (
    <Carte className="mt-6 p-5">
      <Text className="font-titre text-colimo-neutre-fonce">{titre}</Text>
      <View className="mt-3">
        <StarRating value={note} onChange={setNote} />
      </View>
      <TextInput
        value={commentaire}
        onChangeText={setCommentaire}
        placeholder="Un commentaire (optionnel)"
        multiline
        className="mt-3 min-h-[60px] rounded-xl border border-colimo-neutre-clair px-4 py-3 font-texte text-colimo-neutre-fonce"
      />
      {erreur && <Text className="mt-2 font-texte text-xs text-colimo-rouge">{erreur}</Text>}
      <Bouton
        label="Envoyer la note"
        onPress={envoyer}
        disabled={note === 0}
        chargement={envoiEnCours}
        className="mt-3 py-3"
      />
    </Carte>
  );
}
