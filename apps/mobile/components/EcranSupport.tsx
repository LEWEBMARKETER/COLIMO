import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import { envoyerDemandeSupport } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const NUMERO_WHATSAPP = "+241 66 49 90 28";
const NUMERO_WHATSAPP_WA_ME = "24166499028";
const EMAIL_SUPPORT = "contact@colimo.online";
const MESSAGE_WHATSAPP_PREREMPLI = "Bonjour, j'ai besoin d'aide concernant mon compte COLIMO.";
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Écran partagé par les onglets Support client et coursier — même design,
// même formulaire, seule la présence du bouton "Retour" éventuel (aucun ici,
// c'est un onglet du footer, pas un écran empilé) change selon l'appelant.
export default function EcranSupport() {
  const { utilisateur, session } = useAuth();

  const [nom, setNom] = useState(
    utilisateur?.prenom ? `${utilisateur.prenom} ${utilisateur.nom}` : utilisateur?.nom ?? ""
  );
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  const peutEnvoyer = Boolean(
    nom.trim() && REGEX_EMAIL.test(email.trim()) && sujet.trim() && message.trim() && !envoiEnCours
  );

  function ouvrirWhatsApp() {
    const url = `https://wa.me/${NUMERO_WHATSAPP_WA_ME}?text=${encodeURIComponent(MESSAGE_WHATSAPP_PREREMPLI)}`;
    Linking.openURL(url).catch(() => {
      // Si l'ouverture échoue (navigateur bloquant les pop-ups...), l'utilisateur
      // a de toute façon le numéro affiché juste au-dessus pour l'appeler/copier.
    });
  }

  function ouvrirEmail() {
    Linking.openURL(`mailto:${EMAIL_SUPPORT}`).catch(() => {
      // Idem : l'adresse reste affichée et copiable si aucun client mail n'est configuré.
    });
  }

  async function envoyer() {
    if (!peutEnvoyer) return;
    setEnvoiEnCours(true);
    setErreur(null);
    setEnvoye(false);
    try {
      await envoyerDemandeSupport({ nom: nom.trim(), email: email.trim(), sujet: sujet.trim(), message: message.trim() });
      setEnvoye(true);
      setSujet("");
      setMessage("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'envoyer votre demande. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-colimo-fond px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="font-titre text-lg text-colimo-neutre-fonce">Support</Text>
      <Text className="mt-0.5 font-texte text-sm text-colimo-neutre-fonce/70">
        Une question, un problème ? Notre équipe vous répond au plus vite.
      </Text>

      <Carte className="mt-6">
        <View className="flex-row items-center gap-2">
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text className="font-texte-medium text-colimo-neutre-fonce">WhatsApp</Text>
        </View>
        <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">{NUMERO_WHATSAPP}</Text>
        <Bouton label="Contacter sur WhatsApp" onPress={ouvrirWhatsApp} className="mt-3" />
      </Carte>

      <Carte className="mt-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="mail-outline" size={20} color="#2B2622" />
          <Text className="font-texte-medium text-colimo-neutre-fonce">Email</Text>
        </View>
        <Text onPress={ouvrirEmail} className="mt-1 font-texte text-sm text-colimo-rouge">
          {EMAIL_SUPPORT}
        </Text>
      </Carte>

      <Text className="mb-3 mt-6 font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
        Envoyer une demande par email
      </Text>

      <ChampTexte label="Nom complet" value={nom} onChangeText={setNom} placeholder="Votre nom" />
      <ChampTexte
        label="Adresse email"
        value={email}
        onChangeText={setEmail}
        placeholder="vous@exemple.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <ChampTexte
        label="Objet de la demande"
        value={sujet}
        onChangeText={setSujet}
        placeholder="Ex : Problème avec ma dernière livraison"
      />
      <ChampTexte
        label="Message"
        value={message}
        onChangeText={setMessage}
        placeholder="Décrivez votre demande en détail..."
        multiline
        numberOfLines={5}
        style={{ minHeight: 120, textAlignVertical: "top" }}
      />

      {envoye && (
        <Text className="mb-4 -mt-2 font-texte text-sm text-emerald-700">
          ✅ Votre demande a bien été envoyée. Nous vous répondrons par email dans les meilleurs délais.
        </Text>
      )}
      {erreur && <Text className="mb-4 -mt-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

      <Bouton label="Envoyer ma demande" onPress={envoyer} disabled={!peutEnvoyer} chargement={envoiEnCours} />
    </ScrollView>
  );
}
