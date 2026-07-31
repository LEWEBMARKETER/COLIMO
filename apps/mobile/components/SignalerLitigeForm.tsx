import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { LITIGE_MOTIF_LABELS, type LitigeMotif } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import PreuveLitigePicker, { type FichierPreuve } from "@/components/PreuveLitigePicker";
import { creerLitige, patchCourse, uploaderPreuveLitige } from "@/lib/api";

const MOTIFS: { valeur: LitigeMotif; label: string }[] = (
  Object.keys(LITIGE_MOTIF_LABELS) as LitigeMotif[]
).map((valeur) => ({ valeur, label: LITIGE_MOTIF_LABELS[valeur] }));

interface SignalerLitigeFormProps {
  courseId: string;
  auteurId: string;
}

export default function SignalerLitigeForm({ courseId, auteurId }: SignalerLitigeFormProps) {
  const [motif, setMotif] = useState<LitigeMotif | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [preuves, setPreuves] = useState<FichierPreuve[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer() {
    if (!motif) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const preuveUrls = await Promise.all(
        preuves.map((fichier) => uploaderPreuveLitige(auteurId, courseId, fichier.uri, fichier.mimeType))
      );
      await creerLitige({
        courseId,
        auteurId,
        motif,
        commentaire: commentaire.trim() || undefined,
        preuveUrls,
      });
      await patchCourse(courseId, { statut: "litige" });
      router.back();
    } catch {
      setErreur("Impossible d'envoyer le signalement. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="mb-1 font-titre text-lg text-colimo-neutre-fonce">Signaler un problème</Text>
      <Text className="mb-6 font-texte text-sm text-colimo-neutre-fonce/70">
        Notre équipe examinera votre signalement et vous contactera pour le résoudre.
      </Text>

      <GroupePastilles label="Motif" options={MOTIFS} value={motif} onChange={setMotif} />

      <ChampTexte
        label="Commentaire (facultatif)"
        value={commentaire}
        onChangeText={setCommentaire}
        placeholder="Décrivez ce qui s'est passé..."
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />

      <PreuveLitigePicker value={preuves} onChange={setPreuves} />

      {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

      <Bouton label="Envoyer le signalement" onPress={envoyer} disabled={!motif} chargement={envoiEnCours} />
    </ScrollView>
  );
}
