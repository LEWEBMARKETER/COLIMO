import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import {
  RESEAU_PAIEMENT_LABELS,
  formatFCFA,
  getFournisseurPaiement,
  type Course,
  type Paiement,
  type PaymentOperator,
} from "@colimo/shared";
import PhotoPicker from "@/components/PhotoPicker";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import ChiffreCle from "@/components/ui/ChiffreCle";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { TEINTES_STATUT } from "@/components/ui/StatutChip";
import { declarerPaiement, getPaiementParCourse, initierPaiementManuel, uploaderCapturePaiement } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const RESEAUX: { valeur: PaymentOperator; label: string }[] = [
  { valeur: "airtel_money", label: RESEAU_PAIEMENT_LABELS.airtel_money },
  { valeur: "moov_money", label: RESEAU_PAIEMENT_LABELS.moov_money },
];

// Réutilise le vocabulaire de couleur de StatutChip (course) pour les
// statuts de paiement — familles de statuts différentes, mêmes teintes.
function BadgeStatutPaiement({ label, couleur }: { label: string; couleur: string }) {
  return (
    <View style={{ backgroundColor: couleur }} className="self-center rounded-md px-3 py-1.5">
      <Text className="font-titre text-xs uppercase tracking-wide text-white">{label}</Text>
    </View>
  );
}

interface PaiementAirtelMoneyProps {
  course: Course;
}

export default function PaiementAirtelMoney({ course }: PaiementAirtelMoneyProps) {
  const { session } = useAuth();
  const [paiement, setPaiement] = useState<Paiement | null>(null);
  const [chargement, setChargement] = useState(true);
  const [declarationOuverte, setDeclarationOuverte] = useState(false);

  const [reseau, setReseau] = useState<PaymentOperator | null>("airtel_money");
  const [numeroPayeur, setNumeroPayeur] = useState("");
  const [montantPaye, setMontantPaye] = useState(String(course.prix));
  const [referenceTransaction, setReferenceTransaction] = useState("");
  const [datePaiement, setDatePaiement] = useState("");
  const [capture, setCapture] = useState<{ uri: string; mimeType: string } | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let annule = false;
    async function charger() {
      const existant = await getPaiementParCourse(course.id);
      const paiementActuel =
        existant ?? (await initierPaiementManuel({ courseId: course.id, utilisateurId: session!.user.id, montantAttendu: course.prix }));
      if (!annule) {
        setPaiement(paiementActuel);
        setChargement(false);
      }
    }
    charger();
    return () => {
      annule = true;
    };
  }, [session, course.id, course.prix]);

  if (chargement || !paiement) {
    return (
      <View className="items-center justify-center py-12">
        <ActivityIndicator color="#C41E24" />
      </View>
    );
  }

  const fournisseur = getFournisseurPaiement();
  const instructions = fournisseur.obtenirInstructions(formatFCFA(paiement.montantAttendu), paiement.reference);

  async function soumettreDeclaration() {
    if (!session || !reseau || !numeroPayeur.trim() || !montantPaye.trim()) return;
    setErreur(null);

    let datePaiementIso: string | undefined;
    if (datePaiement.trim()) {
      const date = new Date(datePaiement);
      if (Number.isNaN(date.getTime())) {
        setErreur("Format de date invalide. Exemple : 2026-08-01 14:30");
        return;
      }
      datePaiementIso = date.toISOString();
    }

    setEnvoiEnCours(true);
    try {
      let captureUrl: string | undefined;
      if (capture) {
        captureUrl = await uploaderCapturePaiement(session.user.id, course.id, capture.uri, capture.mimeType);
      }
      const misAJour = await declarerPaiement(paiement!.id, {
        reseau,
        numeroPayeur: numeroPayeur.trim(),
        montantPaye: Number(montantPaye),
        referenceTransaction: referenceTransaction.trim() || undefined,
        datePaiementDeclaree: datePaiementIso,
        captureUrl,
      });
      setPaiement(misAJour);
      setDeclarationOuverte(false);
    } catch {
      setErreur("Impossible d'enregistrer votre déclaration de paiement. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (paiement.statut === "en_attente_validation") {
    return (
      <View className="items-center px-6 py-10">
        <BadgeStatutPaiement label="En attente de validation" couleur={TEINTES_STATUT.en_attente.forte} />
        <Text className="mt-4 text-center font-titre text-lg text-colimo-neutre-fonce">
          Votre paiement est en cours de vérification
        </Text>
        <Text className="mt-2 text-center font-texte text-sm text-colimo-neutre-fonce/60">
          Référence {paiement.reference} — notre équipe valide les paiements manuellement, vous serez
          notifié·e dès que ce sera fait.
        </Text>
      </View>
    );
  }

  if (paiement.statut === "paiement_confirme") {
    return (
      <View className="items-center px-6 py-10">
        <BadgeStatutPaiement label="Paiement confirmé" couleur={TEINTES_STATUT.confirmee.forte} />
        <Text className="mt-4 text-center font-titre text-lg text-colimo-neutre-fonce">
          Merci ! Votre livraison est en cours de traitement.
        </Text>
        <Bouton label="Voir ma course" onPress={() => router.push(`/(client)/track/${course.id}`)} className="mt-6 px-8" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
      {paiement.statut === "paiement_rejete" && (
        <Carte className="mb-4 border-colimo-rouge">
          <Text className="font-texte-medium text-sm text-colimo-rouge">Paiement rejeté</Text>
          <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/70">
            {paiement.motifRejet ?? "Merci de vérifier les informations transmises ou de contacter le support."}
          </Text>
        </Carte>
      )}

      {!declarationOuverte && (
        <>
          <Carte sombre>
            <View className="items-center py-2">
              <ChiffreCle valeur={formatFCFA(paiement.montantAttendu)} label="Frais de livraison à payer" sombre />
            </View>
          </Carte>

          <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
              Airtel Money
            </Text>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="font-texte text-sm text-colimo-neutre-fonce/60">Numéro</Text>
              <Text className="font-titre text-colimo-neutre-fonce">{instructions.numero}</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-texte text-sm text-colimo-neutre-fonce/60">Nom</Text>
              <Text className="font-texte-medium text-colimo-neutre-fonce">{instructions.titulaire}</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-texte text-sm text-colimo-neutre-fonce/60">Référence</Text>
              <Text className="font-texte-medium text-colimo-neutre-fonce">{paiement.reference}</Text>
            </View>
            <Text className="mt-4 font-texte text-xs text-colimo-neutre-fonce/60">{instructions.instructions}</Text>
          </View>

          <Bouton
            label={paiement.statut === "paiement_rejete" ? "Redéclarer mon paiement" : "J'ai effectué le paiement"}
            onPress={() => setDeclarationOuverte(true)}
            className="mt-6"
          />
        </>
      )}

      {declarationOuverte && (
        <>
          <Text className="mb-4 font-titre text-lg text-colimo-neutre-fonce">Confirmer mon paiement</Text>

          <GroupePastilles label="Réseau utilisé" options={RESEAUX} value={reseau} onChange={setReseau} />
          <ChampTexte
            label="Numéro ayant effectué le paiement"
            value={numeroPayeur}
            onChangeText={setNumeroPayeur}
            keyboardType="phone-pad"
            placeholder="+241 XX XXX XXX"
          />
          <ChampTexte
            label="Montant payé (FCFA)"
            value={montantPaye}
            onChangeText={setMontantPaye}
            keyboardType="numeric"
          />
          <ChampTexte
            label="Référence de la transaction (optionnel)"
            value={referenceTransaction}
            onChangeText={setReferenceTransaction}
            placeholder="Référence reçue par SMS"
          />
          <ChampTexte
            label="Date et heure du paiement (optionnel)"
            value={datePaiement}
            onChangeText={setDatePaiement}
            placeholder="Ex : 2026-08-01 14:30"
          />
          <PhotoPicker
            label="Capture d'écran du paiement (optionnel)"
            rond={false}
            uri={capture?.uri ?? null}
            onChange={(uri, mimeType) => setCapture({ uri, mimeType })}
          />

          {erreur && <Text className="mb-3 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

          <Bouton
            label="Envoyer ma déclaration"
            onPress={soumettreDeclaration}
            disabled={!reseau || !numeroPayeur.trim() || !montantPaye.trim() || envoiEnCours}
            chargement={envoiEnCours}
            className="mt-2"
          />
          <Bouton
            label="Annuler"
            variante="contour"
            onPress={() => setDeclarationOuverte(false)}
            className="mt-3"
          />
        </>
      )}
    </ScrollView>
  );
}
