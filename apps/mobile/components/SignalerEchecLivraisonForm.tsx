import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { MOTIF_ECHEC_LIVRAISON_LABELS, type MotifEchecLivraison } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { declarerEchecLivraison } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";

const MOTIFS: { valeur: MotifEchecLivraison; label: string }[] = (
  Object.keys(MOTIF_ECHEC_LIVRAISON_LABELS) as MotifEchecLivraison[]
).map((valeur) => ({ valeur, label: MOTIF_ECHEC_LIVRAISON_LABELS[valeur] }));

interface SignalerEchecLivraisonFormProps {
  courseId: string;
  coursierId: string;
}

// Distinct du litige (SignalerLitigeForm) : un échec de remise n'est pas un
// désaccord nécessitant un arbitrage COLIMO, c'est un constat immédiat sur
// le terrain — motif obligatoire, résolution rapide (nouvelle tentative ou
// retour) décidée par le client, pas par l'équipe COLIMO.
export default function SignalerEchecLivraisonForm({ courseId, coursierId }: SignalerEchecLivraisonFormProps) {
  const [motif, setMotif] = useState<MotifEchecLivraison | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer() {
    if (!motif) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const course = await declarerEchecLivraison(courseId, motif, commentaire.trim() || undefined);
      await notifierEvenement("livraison_echouee", {
        declenchePar: coursierId,
        destinataire: course.telephoneDestinataire,
        variables: { numero_commande: course.numeroCommande, motif: MOTIF_ECHEC_LIVRAISON_LABELS[motif] },
      });
      await notifierEvenement("notification_livraison_echouee", {
        declenchePar: coursierId,
        destinataire: course.clientId,
        utilisateurId: course.clientId,
        variables: { numero_commande: course.numeroCommande },
      });
      router.back();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'enregistrer cet échec. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="mb-1 font-titre text-lg text-colimo-neutre-fonce">Signaler un échec de livraison</Text>
      <Text className="mb-6 font-texte text-sm text-colimo-neutre-fonce/70">
        Le client sera prévenu immédiatement et choisira une nouvelle tentative ou le retour du colis.
      </Text>

      <GroupePastilles label="Motif" options={MOTIFS} value={motif} onChange={setMotif} />

      <ChampTexte
        label="Commentaire (facultatif)"
        value={commentaire}
        onChangeText={setCommentaire}
        placeholder="Précisez si besoin..."
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />

      {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

      <Bouton label="Confirmer l'échec" onPress={envoyer} disabled={!motif} chargement={envoiEnCours} />
    </ScrollView>
  );
}
