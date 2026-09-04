import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  ZONE_LABELS,
  calculerPlanEffectif,
  calculerStatistiquesAvanceesCommercant,
  calculerStatistiquesCommercant,
  formatFCFA,
  joursAvantExpiration,
  type Commercant,
  type CommerceCoursierFavori,
  type Course,
  type CoursierAvecUtilisateur,
} from "@colimo/shared";
import BadgeAbonnement from "@/components/BadgeAbonnement";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChiffreCle from "@/components/ui/ChiffreCle";
import { getCoursiers, getCoursiersFavorisCommerce, getCourses, getMonCommerce } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const STATUTS_EN_COURS = new Set(["en_attente", "acceptee", "retrait", "en_cours"]);
const STATUTS_TERMINEES = new Set(["livree", "confirmee"]);

function estAujourdhui(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function CommerceDashboard() {
  const { session, utilisateur } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursiers, setCoursiers] = useState<CoursierAvecUtilisateur[]>([]);
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [favorisReels, setFavorisReels] = useState<CommerceCoursierFavori[] | null>(null);

  useEffect(() => {
    if (!session) return;
    getCourses({ clientId: session.user.id }).then(setCourses);
    getCoursiers().then(setCoursiers);
    getMonCommerce(session.user.id).then((c) => {
      setCommerce(c);
      // Une fois le Pack Business actif, la vraie liste de coursiers favoris
      // (enregistrée par le commerce) remplace le top informel calculé par
      // fréquence ci-dessous — évite d'afficher deux notions différentes de
      // "favori" au même endroit.
      if (c && calculerPlanEffectif(c) === "business") {
        getCoursiersFavorisCommerce(c.id).then(setFavorisReels);
      }
    });
  }, [session]);

  const planEffectif = commerce ? calculerPlanEffectif(commerce) : "gratuit";
  const joursRestants = commerce ? joursAvantExpiration(commerce) : null;
  const abonnementExpireBientot = planEffectif !== "gratuit" && joursRestants !== null && joursRestants <= 7;

  const statistiquesMois = useMemo(() => calculerStatistiquesCommercant(courses), [courses]);
  const statistiquesAvancees = useMemo(() => calculerStatistiquesAvanceesCommercant(courses), [courses]);

  const coursesJour = courses.filter((c) => estAujourdhui(c.createdAt));
  const enCours = courses.filter((c) => STATUTS_EN_COURS.has(c.statut)).length;
  const terminees = courses.filter((c) => STATUTS_TERMINEES.has(c.statut)).length;
  const depensesJour = coursesJour.filter((c) => c.statut !== "annulee").reduce((s, c) => s + c.prix, 0);

  // Business : vraie liste enregistrée (commerce_coursiers_favoris). Autres
  // plans : top-3 informel calculé par fréquence de livraisons confirmées,
  // en l'absence d'accès à la fonctionnalité "coursiers favoris" elle-même.
  const coursCoursier = new Map<string, number>();
  courses
    .filter((c) => c.coursierId && c.statut === "confirmee")
    .forEach((c) => coursCoursier.set(c.coursierId as string, (coursCoursier.get(c.coursierId as string) ?? 0) + 1));

  const favoris =
    planEffectif === "business"
      ? (favorisReels ?? []).map((f) => {
          const coursier = coursiers.find((c) => c.utilisateurId === f.coursierId);
          const nom = coursier ? (coursier.utilisateur.prenom ?? coursier.utilisateur.nom) : "Coursier";
          return { nom, nombre: coursCoursier.get(f.coursierId) ?? 0 };
        })
      : [...coursCoursier.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([utilisateurId, nombre]) => {
            const coursier = coursiers.find((c) => c.utilisateurId === utilisateurId);
            const nom = coursier ? (coursier.utilisateur.prenom ?? coursier.utilisateur.nom) : "Coursier";
            return { nom, nombre };
          });

  return (
    <View>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="font-titre text-xl text-colimo-neutre-fonce">
            Bonjour {utilisateur?.nom ?? ""} 👋
          </Text>
          <Text className="mt-0.5 font-texte text-sm text-colimo-neutre-fonce/70">Vue d&apos;ensemble du jour</Text>
        </View>
        {commerce && <BadgeAbonnement plan={planEffectif} dateExpiration={commerce.abonnementExpireLe} />}
      </View>

      {abonnementExpireBientot && (
        <Pressable
          onPress={() => router.push("/(client)/commerce/decouvrir")}
          className="mt-3 rounded-xl border border-colimo-rouge/30 bg-colimo-rouge-clair px-4 py-3"
        >
          <Text className="font-texte-medium text-sm text-colimo-rouge">
            Votre abonnement expire dans {joursRestants} jour{(joursRestants ?? 0) > 1 ? "s" : ""}.
          </Text>
          <Text className="mt-0.5 font-texte text-xs text-colimo-rouge/80">Demander le renouvellement</Text>
        </Pressable>
      )}

      <Carte sombre className="mt-4">
        <ChiffreCle valeur={formatFCFA(depensesJour)} label="Dépenses du jour" sombre />
      </Carte>

      <View className="mt-3 flex-row flex-wrap gap-3">
        <Carte className="min-w-[30%] flex-1">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Livraisons du jour</Text>
          <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{coursesJour.length}</Text>
        </Carte>
        <Carte className="min-w-[30%] flex-1">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">En cours</Text>
          <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{enCours}</Text>
        </Carte>
        <Carte className="min-w-[30%] flex-1">
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Terminées</Text>
          <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{terminees}</Text>
        </Carte>
      </View>

      <Carte className="mt-3">
        <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Coursiers favoris</Text>
        {favoris.length === 0 ? (
          <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/50">
            {planEffectif === "business"
              ? "Aucun coursier favori enregistré pour le moment."
              : "Pas encore assez de livraisons confirmées"}
          </Text>
        ) : (
          favoris.map((f) => (
            <View key={f.nom} className="mt-1 flex-row items-center justify-between">
              <Text className="font-texte text-sm text-colimo-neutre-fonce">{f.nom}</Text>
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">{f.nombre} livraison(s)</Text>
            </View>
          ))
        )}
      </Carte>

      {(planEffectif === "starter" || planEffectif === "business") && (
        <View className="mt-3">
          <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
            Ce mois-ci
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-3">
            <Carte className="min-w-[30%] flex-1">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Courses</Text>
              <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{statistiquesMois.nombreCoursesMois}</Text>
            </Carte>
            <Carte className="min-w-[30%] flex-1">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Terminées</Text>
              <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{statistiquesMois.nombreTermineesMois}</Text>
            </Carte>
            <Carte className="min-w-[30%] flex-1">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Annulées</Text>
              <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{statistiquesMois.nombreAnnuleesMois}</Text>
            </Carte>
            <Carte className="min-w-[30%] flex-1">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Dépenses</Text>
              <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{formatFCFA(statistiquesMois.depensesMois)}</Text>
            </Carte>
            <Carte className="min-w-[30%] flex-1">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Clients servis</Text>
              <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">{statistiquesMois.nombreClientsServis}</Text>
            </Carte>
          </View>
        </View>
      )}

      {planEffectif === "business" && (
        <View className="mt-3">
          <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
            Performance
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-3">
            <Carte className="min-w-[30%] flex-1">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Taux de réussite</Text>
              <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">
                {Math.round(statistiquesAvancees.tauxReussite * 100)}%
              </Text>
            </Carte>
            <Carte className="min-w-[30%] flex-1">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Taux d&apos;annulation</Text>
              <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">
                {Math.round(statistiquesAvancees.tauxAnnulation * 100)}%
              </Text>
            </Carte>
            <Carte className="min-w-[30%] flex-1">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Temps moyen</Text>
              <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">
                {statistiquesAvancees.dureeLivraisonMoyenneSecondes
                  ? `${Math.round(statistiquesAvancees.dureeLivraisonMoyenneSecondes / 60)} min`
                  : "—"}
              </Text>
            </Carte>
          </View>

          {statistiquesAvancees.principalesDestinations.length > 0 && (
            <Carte className="mt-3">
              <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Principales destinations</Text>
              {statistiquesAvancees.principalesDestinations.map((d) => (
                <View key={d.zone} className="mt-1 flex-row items-center justify-between">
                  <Text className="font-texte text-sm text-colimo-neutre-fonce">{ZONE_LABELS[d.zone]}</Text>
                  <Text className="font-texte text-xs text-colimo-neutre-fonce/60">{d.nombre} livraison(s)</Text>
                </View>
              ))}
            </Carte>
          )}
        </View>
      )}

      <Pressable onPress={() => router.push("/(client)/commerce/decouvrir")} className="mt-3">
        <Carte className="border border-colimo-neutre-clair">
          <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">COLIMO PRO</Text>
          <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/60">
            {planEffectif === "gratuit"
              ? "Débloquez le carnet de destinataires, les exports et le tableau de bord avancé."
              : "Consultez votre forfait et les fonctionnalités disponibles."}
          </Text>
          <Text className="mt-2 font-texte-medium text-xs text-colimo-rouge">Découvrir nos offres →</Text>
        </Carte>
      </Pressable>

      {(planEffectif === "starter" || planEffectif === "business") && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Text
            onPress={() => router.push("/(client)/commerce/destinataires")}
            className="rounded-full border border-colimo-neutre-clair bg-white px-3 py-1.5 font-texte-medium text-xs text-colimo-neutre-fonce"
          >
            Carnet de destinataires
          </Text>
          <Text
            onPress={() => router.push("/(client)/commerce/adresses")}
            className="rounded-full border border-colimo-neutre-clair bg-white px-3 py-1.5 font-texte-medium text-xs text-colimo-neutre-fonce"
          >
            Adresses
          </Text>
          <Text
            onPress={() => router.push("/(client)/commerce/export")}
            className="rounded-full border border-colimo-neutre-clair bg-white px-3 py-1.5 font-texte-medium text-xs text-colimo-neutre-fonce"
          >
            Exporter
          </Text>
          {planEffectif === "business" && (
            <>
              <Text
                onPress={() => router.push("/(client)/commerce/equipe")}
                className="rounded-full border border-colimo-neutre-clair bg-white px-3 py-1.5 font-texte-medium text-xs text-colimo-neutre-fonce"
              >
                Équipe
              </Text>
              <Text
                onPress={() => router.push("/(client)/commerce/coursiers-favoris")}
                className="rounded-full border border-colimo-neutre-clair bg-white px-3 py-1.5 font-texte-medium text-xs text-colimo-neutre-fonce"
              >
                Coursiers favoris
              </Text>
            </>
          )}
        </View>
      )}

      <View className="mt-6">
        <Bouton label="Nouvelle livraison" onPress={() => router.push("/(client)/nouvelle-livraison")} />
      </View>
    </View>
  );
}
