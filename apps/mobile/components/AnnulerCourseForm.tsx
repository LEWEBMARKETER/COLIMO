import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { MOTIF_ANNULATION_CLIENT_LABELS, type MotifAnnulationClient } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { annulerCourseClient } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";

const MOTIFS: { valeur: MotifAnnulationClient; label: string }[] = (
  Object.keys(MOTIF_ANNULATION_CLIENT_LABELS) as MotifAnnulationClient[]
).map((valeur) => ({ valeur, label: MOTIF_ANNULATION_CLIENT_LABELS[valeur] }));

interface AnnulerCourseFormProps {
  courseId: string;
  clientId: string;
}

export default function AnnulerCourseForm({ courseId, clientId }: AnnulerCourseFormProps) {
  const [motif, setMotif] = useState<MotifAnnulationClient | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [etapeConfirmation, setEtapeConfirmation] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer() {
    if (!motif) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const misAJour = await annulerCourseClient({
        courseId,
        motif: MOTIF_ANNULATION_CLIENT_LABELS[motif],
        commentaire: commentaire.trim() || undefined,
      });
      await notifierEvenement("livraison_annulee", {
        declenchePar: clientId,
        destinataire: misAJour.telephoneDestinataire,
        variables: { nom_client: misAJour.nomDestinataire ?? "client", numero_commande: misAJour.numeroCommande },
      });
      await notifierEvenement("notification_livraison_annulee", {
        declenchePar: clientId,
        destinataire: clientId,
        utilisateurId: clientId,
        variables: { numero_commande: misAJour.numeroCommande },
      });
      if (misAJour.coursierId) {
        await notifierEvenement("notification_livraison_annulee_coursier", {
          declenchePar: clientId,
          destinataire: misAJour.coursierId,
          utilisateurId: misAJour.coursierId,
          variables: { numero_commande: misAJour.numeroCommande },
        });
      }
      router.back();
    } catch (e) {
      setErreur(
        e instanceof Error && e.message
          ? e.message
          : "Impossible d'annuler cette course. Réessayez."
      );
      setEtapeConfirmation(false);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (etapeConfirmation) {
    return (
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="mb-3 font-titre text-lg text-colimo-neutre-fonce">
          Êtes-vous certain de vouloir annuler cette course ?
        </Text>
        <Text className="mb-8 font-texte text-sm text-colimo-neutre-fonce/70">Cette action est irréversible.</Text>

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton label="Confirmer l'annulation" onPress={confirmer} chargement={envoiEnCours} />
        <Bouton
          label="Retour"
          variante="contour"
          onPress={() => setEtapeConfirmation(false)}
          disabled={envoiEnCours}
          className="mt-3"
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="mb-1 font-titre text-lg text-colimo-neutre-fonce">Annuler la course</Text>
      <Text className="mb-6 font-texte text-sm text-colimo-neutre-fonce/70">
        Dites-nous pourquoi vous souhaitez annuler cette livraison.
      </Text>

      <GroupePastilles label="Motif" options={MOTIFS} value={motif} onChange={setMotif} />

      {motif === "autre" && (
        <ChampTexte
          label="Précisez le motif"
          value={commentaire}
          onChangeText={setCommentaire}
          placeholder="Expliquez la raison de l'annulation..."
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: "top" }}
        />
      )}

      {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

      <Bouton
        label="Continuer"
        onPress={() => setEtapeConfirmation(true)}
        disabled={!motif || (motif === "autre" && !commentaire.trim())}
      />
    </ScrollView>
  );
}
