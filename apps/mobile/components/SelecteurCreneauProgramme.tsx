import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { formaterCleJour } from "@colimo/shared";
import GroupePastilles from "@/components/ui/GroupePastilles";

// "Calendrier" volontairement sous forme de deux rangées de pastilles
// défilantes (jour, puis heure) plutôt qu'une grille de mois : plus lisible
// et plus rapide à utiliser sur mobile pour choisir un créneau proche
// (14 jours à l'avance), et réutilise GroupePastilles déjà utilisé partout
// ailleurs dans ce formulaire (Type de livraison, Statut du paiement...)
// plutôt que d'introduire une nouvelle bibliothèque de calendrier.
const NB_JOURS_AFFICHES = 14;
const HEURE_OUVERTURE = 8;
const HEURE_FERMETURE = 20;
const JOURS_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function genererJours(): { valeur: string; label: string }[] {
  const maintenant = new Date();
  const options: { valeur: string; label: string }[] = [];
  for (let i = 0; i < NB_JOURS_AFFICHES; i++) {
    const date = new Date(maintenant);
    date.setDate(date.getDate() + i);
    const label = i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : `${JOURS_LABELS[date.getDay()]} ${date.getDate()}`;
    options.push({ valeur: formaterCleJour(date), label });
  }
  return options;
}

function genererHeures(): string[] {
  const heures: string[] = [];
  for (let h = HEURE_OUVERTURE; h <= HEURE_FERMETURE; h++) {
    for (const m of [0, 30]) {
      if (h === HEURE_FERMETURE && m === 30) continue;
      heures.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return heures;
}

interface SelecteurCreneauProgrammeProps {
  jour: string | null;
  heure: string | null;
  onChangeJour: (jour: string) => void;
  onChangeHeure: (heure: string) => void;
}

export default function SelecteurCreneauProgramme({
  jour,
  heure,
  onChangeJour,
  onChangeHeure,
}: SelecteurCreneauProgrammeProps) {
  const jours = useMemo(genererJours, []);
  const toutesLesHeures = useMemo(genererHeures, []);

  // Sur "Aujourd'hui", retire les créneaux déjà passés (avec 30 min de
  // battement pour laisser le temps de traiter la demande) plutôt que de
  // laisser programmer une livraison dans le passé.
  const heuresDisponibles = useMemo(() => {
    if (jour !== jours[0].valeur) return toutesLesHeures;
    const maintenant = new Date();
    maintenant.setMinutes(maintenant.getMinutes() + 30);
    const seuil = maintenant.getHours() * 60 + maintenant.getMinutes();
    return toutesLesHeures.filter((h) => {
      const [hh, mm] = h.split(":").map(Number);
      return hh * 60 + mm >= seuil;
    });
  }, [jour, jours, toutesLesHeures]);

  useEffect(() => {
    if (heure && !heuresDisponibles.includes(heure)) onChangeHeure("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heuresDisponibles]);

  const optionsHeures = heuresDisponibles.map((h) => ({ valeur: h, label: h }));

  return (
    <View>
      <GroupePastilles label="Jour" options={jours} value={jour} onChange={onChangeJour} defilement />
      {jour &&
        (optionsHeures.length > 0 ? (
          <GroupePastilles label="Heure" options={optionsHeures} value={heure} onChange={onChangeHeure} defilement />
        ) : (
          <Text className="mb-4 font-texte text-sm text-colimo-neutre-fonce/60">
            Plus aucun créneau disponible aujourd&apos;hui — choisissez un autre jour.
          </Text>
        ))}
    </View>
  );
}
