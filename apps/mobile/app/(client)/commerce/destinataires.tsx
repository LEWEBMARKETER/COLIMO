import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  COURSE_STATUS_LABELS,
  calculerPlanEffectif,
  formatFCFA,
  type Commercant,
  type CommerceDestinataire,
  type Course,
} from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import {
  creerDestinataireCommerce,
  getCoursesPourDestinataire,
  getDestinatairesCommerce,
  getMonCommerce,
  supprimerDestinataireCommerce,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

function DestinataireCarte({ destinataire, onSupprimer }: { destinataire: CommerceDestinataire; onSupprimer: () => void }) {
  const [depliee, setDepliee] = useState(false);
  const [historique, setHistorique] = useState<Course[] | null>(null);

  async function basculer() {
    if (!depliee && historique === null) {
      setHistorique(await getCoursesPourDestinataire(destinataire.id));
    }
    setDepliee((v) => !v);
  }

  return (
    <Carte>
      <View className="flex-row items-center justify-between">
        <Text onPress={basculer} className="flex-1 pr-3 font-texte-medium text-colimo-neutre-fonce">
          {destinataire.nom}
        </Text>
        <Text onPress={onSupprimer} className="font-texte-medium text-xs text-colimo-rouge">
          Retirer
        </Text>
      </View>
      <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/60">{destinataire.telephone}</Text>
      {destinataire.adresse && (
        <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/50">{destinataire.adresse}</Text>
      )}
      <Text onPress={basculer} className="mt-1.5 font-texte text-xs text-colimo-rouge">
        {depliee ? "Masquer l'historique" : "Voir l'historique des livraisons"}
      </Text>
      {depliee && (
        <View className="mt-2 gap-1.5 border-t border-colimo-neutre-clair pt-2">
          {historique === null ? (
            <Text className="font-texte text-xs text-colimo-neutre-fonce/50">Chargement…</Text>
          ) : historique.length === 0 ? (
            <Text className="font-texte text-xs text-colimo-neutre-fonce/50">Aucune livraison pour ce destinataire</Text>
          ) : (
            historique.map((c) => (
              <View key={c.id} className="flex-row items-center justify-between">
                <Text className="font-texte text-xs text-colimo-neutre-fonce/70">{c.numeroCommande}</Text>
                <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                  {formatFCFA(c.prix)} · {COURSE_STATUS_LABELS[c.statut]}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </Carte>
  );
}

export default function DestinatairesScreen() {
  const { session } = useAuth();
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [commerceId, setCommerceId] = useState<string | null>(null);
  const [destinataires, setDestinataires] = useState<CommerceDestinataire[]>([]);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [instructions, setInstructions] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMonCommerce(session.user.id).then((c) => {
      if (!c) return;
      setCommerce(c);
      setCommerceId(c.id);
      getDestinatairesCommerce(c.id).then(setDestinataires);
    });
  }, [session]);

  const planEffectif = commerce ? calculerPlanEffectif(commerce) : "gratuit";

  if (commerce && planEffectif === "gratuit") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-titre text-lg text-colimo-neutre-fonce">🔒 Pack Starter</Text>
          <Text className="mt-2 text-center font-texte text-sm text-colimo-neutre-fonce/60">
            Enregistrez jusqu&apos;à 100 destinataires pour créer vos livraisons en quelques secondes.
          </Text>
          <Bouton
            label="Découvrir l'offre"
            onPress={() => router.push("/(client)/commerce/decouvrir?feature=carnet_destinataires")}
            className="mt-6"
          />
        </View>
      </SafeAreaView>
    );
  }

  async function ajouter() {
    if (!commerceId || !nom.trim() || !telephone.trim()) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const destinataire = await creerDestinataireCommerce({
        commerceId,
        nom: nom.trim(),
        telephone: telephone.trim(),
        adresse: adresse.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      setDestinataires((prev) => [...prev, destinataire].sort((a, b) => a.nom.localeCompare(b.nom)));
      setNom("");
      setTelephone("");
      setAdresse("");
      setInstructions("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'ajouter ce destinataire.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function supprimer(id: string) {
    await supprimerDestinataireCommerce(id);
    setDestinataires((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <FlatList
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 32, gap: 10 }}
        data={destinataires}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={
          <View className="mb-5">
            <Text className="font-titre text-xl text-colimo-neutre-fonce">Carnet de destinataires</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">
              {destinataires.length} / 100 destinataires enregistrés
            </Text>

            <Carte className="mt-4">
              <ChampTexte label="Nom" value={nom} onChangeText={setNom} placeholder="Nom du destinataire" />
              <ChampTexte
                label="Téléphone"
                value={telephone}
                onChangeText={setTelephone}
                keyboardType="phone-pad"
                placeholder="+241 XX XXX XXX"
              />
              <ChampTexte
                label="Adresse (optionnel)"
                value={adresse}
                onChangeText={setAdresse}
                placeholder="Adresse de livraison"
              />
              <ChampTexte
                label="Instructions (optionnel)"
                value={instructions}
                onChangeText={setInstructions}
                placeholder="Ex : Appeler avant d'arriver"
              />
              {erreur && <Text className="mb-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}
              <Bouton label="Ajouter" onPress={ajouter} disabled={!nom.trim() || !telephone.trim()} chargement={envoiEnCours} />
            </Carte>
          </View>
        }
        renderItem={({ item }) => <DestinataireCarte destinataire={item} onSupprimer={() => supprimer(item.id)} />}
        ListEmptyComponent={
          <Text className="mt-4 text-center font-texte text-sm text-colimo-neutre-fonce/50">
            Aucun destinataire enregistré
          </Text>
        }
      />
    </SafeAreaView>
  );
}
