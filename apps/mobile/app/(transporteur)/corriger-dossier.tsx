import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PIECE_IDENTITE_LABELS, type PieceIdentiteType } from "@colimo/shared";
import PhotoPicker from "@/components/PhotoPicker";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { resoumettreDossierTransporteur, uploaderPermisConduire, uploaderPieceIdentite } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const PIECES_IDENTITE = (Object.keys(PIECE_IDENTITE_LABELS) as PieceIdentiteType[]).map((valeur) => ({
  valeur,
  label: PIECE_IDENTITE_LABELS[valeur],
}));

type Photo = { uri: string; mimeType: string };

// Resoumission du dossier transporteur après NON_CONFIRME — besoin
// métier : "permettre au partenaire de corriger puis de soumettre à
// nouveau son dossier" (statut repasse à EN_ATTENTE). Formulaire unique,
// pas un stepper : il s'agit de corriger, pas de reproduire l'inscription
// en 3 étapes (cf. simplifier).
export default function CorrigerDossierScreen() {
  const { utilisateur, transporteur, refreshProfile } = useAuth();
  const [nomEntreprise, setNomEntreprise] = useState(transporteur?.nomEntreprise ?? "");
  const [quartier, setQuartier] = useState(transporteur?.quartier ?? "");
  const [typePieceIdentite, setTypePieceIdentite] = useState<PieceIdentiteType | null>(transporteur?.typePieceIdentite ?? null);
  const [pieceIdentite, setPieceIdentite] = useState<Photo | null>(null);
  const [permisConduire, setPermisConduire] = useState<Photo | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!transporteur || !utilisateur) return null;

  async function soumettre() {
    if (!transporteur || !utilisateur) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const pieceIdentiteUrl = pieceIdentite
        ? await uploaderPieceIdentite(utilisateur.id, pieceIdentite.uri, pieceIdentite.mimeType)
        : undefined;
      const permisConduireUrl = permisConduire
        ? await uploaderPermisConduire(utilisateur.id, permisConduire.uri, permisConduire.mimeType)
        : undefined;
      await resoumettreDossierTransporteur(transporteur.id, {
        nomEntreprise: nomEntreprise.trim() || undefined,
        quartier: quartier.trim() || undefined,
        typePieceIdentite: typePieceIdentite ?? undefined,
        pieceIdentiteUrl,
        permisConduireUrl,
      });
      await refreshProfile();
      router.replace("/(transporteur)/dashboard");
    } catch {
      setErreur("Impossible de soumettre votre dossier. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Corriger mon dossier</Text>

        {transporteur.dernierMotifRejet && (
          <Carte className="mt-4">
            <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">
              Motif indiqué par COLIMO : {transporteur.dernierMotifRejet}
            </Text>
          </Carte>
        )}

        <View className="mt-6">
          <ChampTexte
            label="Nom de l'entreprise (optionnel)"
            value={nomEntreprise}
            onChangeText={setNomEntreprise}
            placeholder="Si vous représentez une société de transport"
          />
          <ChampTexte label="Quartier (optionnel)" value={quartier} onChangeText={setQuartier} placeholder='Ex : "Nzeng-Ayong"' />

          <GroupePastilles
            label="Type de pièce d'identité"
            options={PIECES_IDENTITE}
            value={typePieceIdentite}
            onChange={setTypePieceIdentite}
          />
          <PhotoPicker
            label="Nouvelle photo de la pièce d'identité (si à remplacer)"
            uri={pieceIdentite?.uri ?? null}
            onChange={(uri, mimeType) => setPieceIdentite({ uri, mimeType })}
            rond={false}
          />
          <PhotoPicker
            label="Nouveau permis de conduire (si à remplacer)"
            uri={permisConduire?.uri ?? null}
            onChange={(uri, mimeType) => setPermisConduire({ uri, mimeType })}
            rond={false}
          />
        </View>

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton label="Soumettre à nouveau" onPress={soumettre} chargement={envoiEnCours} className="mt-2" />
      </ScrollView>
    </SafeAreaView>
  );
}
