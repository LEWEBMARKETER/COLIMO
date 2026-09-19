import { useEffect, useState } from "react";
import { Share, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ROLE_COMMERCE_MEMBRE_LABELS,
  calculerPlanEffectif,
  type Commercant,
  type CommerceMembre,
  type InvitationCommerce,
  type RoleCommerceMembre,
} from "@colimo/shared";
import CarteUpsellPro from "@/components/CarteUpsellPro";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { creerInvitationCommerce, getInvitationsCommerce, getMembresCommerce, getMonCommerce } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const ROLES: { valeur: RoleCommerceMembre; label: string }[] = [
  { valeur: "responsable", label: ROLE_COMMERCE_MEMBRE_LABELS.responsable },
  { valeur: "employe", label: ROLE_COMMERCE_MEMBRE_LABELS.employe },
];

export default function EquipeScreen() {
  const { session } = useAuth();
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [membres, setMembres] = useState<CommerceMembre[]>([]);
  const [invitations, setInvitations] = useState<InvitationCommerce[]>([]);
  const [role, setRole] = useState<RoleCommerceMembre>("employe");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMonCommerce(session.user.id).then((c) => {
      if (!c) return;
      setCommerce(c);
      getMembresCommerce(c.id).then(setMembres);
      getInvitationsCommerce(c.id).then(setInvitations);
    });
  }, [session]);

  const planEffectif = commerce ? calculerPlanEffectif(commerce) : "gratuit";
  const nombreSousComptes = membres.filter((m) => m.role !== "administrateur").length;

  async function inviter() {
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const invitation = await creerInvitationCommerce(role);
      setInvitations((prev) => [invitation, ...prev]);
      await Share.share({
        message: `Rejoignez notre commerce sur COLIMO avec le code d'invitation : ${invitation.code}`,
      });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de créer l'invitation.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (planEffectif !== "business") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
        <CarteUpsellPro cle="gestion_equipe" pleinEcran />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-titre text-xl text-colimo-neutre-fonce">Utilisateurs du commerce</Text>
        <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">
          {nombreSousComptes} / 3 utilisateurs supplémentaires
        </Text>

        <View className="mt-4 gap-2">
          {membres.map((m) => (
            <Carte key={m.id} className="flex-row items-center justify-between">
              <Text className="font-texte-medium text-colimo-neutre-fonce">
                {m.role === "administrateur" ? "Vous (propriétaire)" : "Utilisateur"}
              </Text>
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">{ROLE_COMMERCE_MEMBRE_LABELS[m.role]}</Text>
            </Carte>
          ))}
        </View>

        {nombreSousComptes < 3 && (
          <Carte className="mt-5">
            <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">Inviter un utilisateur</Text>
            <GroupePastilles label="Rôle" options={ROLES} value={role} onChange={setRole} />
            {erreur && <Text className="mb-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}
            <Bouton label="Générer un code d'invitation" onPress={inviter} chargement={envoiEnCours} />
          </Carte>
        )}

        {invitations.filter((i) => !i.utiliseParId).length > 0 && (
          <View className="mt-5">
            <Text className="mb-2 font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
              Invitations en attente
            </Text>
            {invitations
              .filter((i) => !i.utiliseParId)
              .map((i) => (
                <Carte key={i.id} className="mb-2 flex-row items-center justify-between">
                  <Text className="font-mono text-sm text-colimo-neutre-fonce">{i.code}</Text>
                  <Text className="font-texte text-xs text-colimo-neutre-fonce/50">{ROLE_COMMERCE_MEMBRE_LABELS[i.role]}</Text>
                </Carte>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
