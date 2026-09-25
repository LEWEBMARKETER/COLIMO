import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Program, ProgramParticipant } from "@colimo/shared";
import Carte from "@/components/ui/Carte";
import Bouton from "@/components/ui/Bouton";
import { candidaterProgramme, getCompteurProgramme, getMaCandidatureProgramme } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import { useAuth } from "@/lib/AuthContext";

interface CarteProgrammeProps {
  programme: Program;
}

// Carte générique pour n'importe quel programme (cf. packages/shared/src/programmes)
// — rien ici n'est spécifique à "100 Commerces Partenaires". Affiche les
// avantages tels qu'enregistrés en base (jamais codés en dur), le nombre de
// places restantes, et un CTA dont le libellé suit l'état de la
// candidature de l'utilisateur courant.
export default function CarteProgramme({ programme }: CarteProgrammeProps) {
  const { session } = useAuth();
  const [candidature, setCandidature] = useState<ProgramParticipant | null>(null);
  const [placesRestantes, setPlacesRestantes] = useState<number | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    const [maCandidature, compteur] = await Promise.all([
      getMaCandidatureProgramme(programme.id),
      getCompteurProgramme(programme.id),
    ]);
    setCandidature(maCandidature);
    setPlacesRestantes(compteur.placesRestantes);
  }

  useEffect(() => {
    charger().finally(() => setChargement(false));
  }, [programme.id]);

  async function candidater() {
    if (!session) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const nouvelleCandidature = await candidaterProgramme(programme.id);
      setCandidature(nouvelleCandidature);
      await notifierEvenement("programme_candidature_recue", {
        declenchePar: session.user.id,
        destinataire: session.user.id,
        utilisateurId: session.user.id,
        variables: { nom_programme: programme.name },
      });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'envoyer votre candidature.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  const complet = placesRestantes === 0 && !candidature;

  return (
    <Carte className="mt-4">
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-colimo-rouge-clair">
          <Ionicons name="people-outline" size={18} color="#C41E24" />
        </View>
        <Text className="flex-1 font-titre text-base text-colimo-neutre-fonce" numberOfLines={2}>
          {programme.name}
        </Text>
      </View>

      {programme.description && (
        <Text className="mt-2 font-texte text-sm text-colimo-neutre-fonce/70">{programme.description}</Text>
      )}

      {programme.benefits.length > 0 && (
        <View className="mt-3 gap-1">
          {programme.benefits.map((avantage, i) => (
            <View key={i} className="flex-row items-start gap-1.5">
              <Ionicons name="checkmark-circle" size={14} color="#C41E24" style={{ marginTop: 2 }} />
              <Text className="flex-1 font-texte text-xs text-colimo-neutre-fonce/70">{avantage}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        {placesRestantes !== null && (
          <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">
            {placesRestantes} place{placesRestantes > 1 ? "s" : ""} restante{placesRestantes > 1 ? "s" : ""}
          </Text>
        )}
        {programme.endDate && (
          <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">
            Jusqu&apos;au {new Date(programme.endDate).toLocaleDateString("fr-FR")}
          </Text>
        )}
      </View>

      {erreur && <Text className="mt-2 font-texte text-xs text-colimo-rouge">{erreur}</Text>}

      <View className="mt-3">
        {chargement ? null : candidature?.status === "approved" ? (
          <View className="flex-row items-center gap-1.5 rounded-full bg-colimo-rouge-clair px-4 py-3">
            <Ionicons name="checkmark-circle" size={16} color="#C41E24" />
            <Text className="font-texte-medium text-sm text-colimo-rouge">Vous êtes membre du programme</Text>
          </View>
        ) : candidature?.status === "pending" ? (
          <Bouton label="Candidature en cours d'examen" variante="contour" disabled />
        ) : candidature?.status === "rejected" ? (
          <Bouton label="Candidature non retenue" variante="contour" disabled />
        ) : complet ? (
          <Bouton label="Programme complet" variante="contour" disabled />
        ) : (
          <Bouton label="Rejoindre le programme" onPress={candidater} chargement={envoiEnCours} />
        )}
      </View>
    </Carte>
  );
}
