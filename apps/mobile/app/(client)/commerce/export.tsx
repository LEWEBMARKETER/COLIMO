import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import {
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  calculerPlanEffectif,
  formatFCFA,
  type Commercant,
  type CommerceDestinataire,
  type Course,
  type CourseStatus,
} from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { getCourses, getDestinatairesCommerce, getMonCommerce } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const STATUTS_FILTRE: { valeur: CourseStatus | "tous"; label: string }[] = [
  { valeur: "tous", label: "Tous" },
  ...(Object.keys(COURSE_STATUS_LABELS) as CourseStatus[]).map((statut) => ({
    valeur: statut,
    label: COURSE_STATUS_LABELS[statut],
  })),
];

function lignesExport(courses: Course[], destinataires: CommerceDestinataire[]) {
  const nomDestinataire = (id: string | null) => destinataires.find((d) => d.id === id)?.nom ?? null;
  return courses.map((c) => ({
    "N° commande": c.numeroCommande,
    Destinataire: c.nomDestinataire ?? nomDestinataire(c.destinataireCarnetId) ?? "—",
    Adresse: c.adresseArrivee,
    Prix: c.prix,
    Paiement: MODE_PAIEMENT_LABELS[c.modePaiement],
    Statut: COURSE_STATUS_LABELS[c.statut],
    Date: new Date(c.createdAt).toLocaleDateString("fr-FR"),
  }));
}

export default function ExportScreen() {
  const { session } = useAuth();
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [destinataires, setDestinataires] = useState<CommerceDestinataire[]>([]);
  const [filtreStatut, setFiltreStatut] = useState<CourseStatus | "tous">("tous");
  const [filtreDestinataireId, setFiltreDestinataireId] = useState<string>("tous");
  const [exportEnCours, setExportEnCours] = useState<"pdf" | "excel" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getCourses({ clientId: session.user.id }).then(setCourses);
    getMonCommerce(session.user.id).then((c) => {
      if (!c) return;
      setCommerce(c);
      getDestinatairesCommerce(c.id).then(setDestinataires);
    });
  }, [session]);

  const planEffectif = commerce ? calculerPlanEffectif(commerce) : "gratuit";

  const coursesFiltrees = courses.filter(
    (c) =>
      (filtreStatut === "tous" || c.statut === filtreStatut) &&
      (filtreDestinataireId === "tous" || c.destinataireCarnetId === filtreDestinataireId)
  );

  async function exporterPdf() {
    setErreur(null);
    setExportEnCours("pdf");
    try {
      const lignes = lignesExport(coursesFiltrees, destinataires);
      const lignesHtml = lignes
        .map(
          (l) =>
            `<tr><td>${l["N° commande"]}</td><td>${l.Destinataire}</td><td>${l.Adresse}</td><td>${formatFCFA(
              l.Prix
            )}</td><td>${l.Paiement}</td><td>${l.Statut}</td><td>${l.Date}</td></tr>`
        )
        .join("");
      const html = `
        <html><body style="font-family: sans-serif;">
          <h2>COLIMO — Historique des livraisons</h2>
          <p>${coursesFiltrees.length} livraisons — généré le ${new Date().toLocaleDateString("fr-FR")}</p>
          <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr><th>N° commande</th><th>Destinataire</th><th>Adresse</th><th>Prix</th><th>Paiement</th><th>Statut</th><th>Date</th></tr>
            </thead>
            <tbody>${lignesHtml}</tbody>
          </table>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch {
      setErreur("Impossible de générer le PDF. Réessayez.");
    } finally {
      setExportEnCours(null);
    }
  }

  async function exporterExcel() {
    setErreur(null);
    setExportEnCours("excel");
    try {
      const lignes = lignesExport(coursesFiltrees, destinataires);
      const feuille = XLSX.utils.json_to_sheet(lignes);
      const classeur = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(classeur, feuille, "Livraisons");
      const base64 = XLSX.write(classeur, { type: "base64", bookType: "xlsx" }) as string;
      const uri = `${FileSystem.cacheDirectory}colimo-livraisons-${Date.now()}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          UTI: "org.openxmlformats.spreadsheetml.sheet",
        });
      }
    } catch {
      setErreur("Impossible de générer le fichier Excel. Réessayez.");
    } finally {
      setExportEnCours(null);
    }
  }

  if (planEffectif === "gratuit") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-titre text-lg text-colimo-neutre-fonce">🔒 Pack Starter</Text>
          <Text className="mt-2 text-center font-texte text-sm text-colimo-neutre-fonce/60">
            Exportez votre historique de livraisons en PDF (Starter) ou Excel (Business).
          </Text>
          <Bouton
            label="Découvrir l'offre"
            onPress={() => router.push("/(client)/commerce/decouvrir?feature=export_pdf")}
            className="mt-6"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-titre text-xl text-colimo-neutre-fonce">Exporter mon historique</Text>
        <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">{coursesFiltrees.length} livraisons</Text>

        <GroupePastilles
          label="Statut"
          options={STATUTS_FILTRE}
          value={filtreStatut}
          onChange={setFiltreStatut}
          defilement
          className="mt-4"
        />

        {destinataires.length > 0 && (
          <GroupePastilles
            label="Destinataire"
            options={[{ valeur: "tous", label: "Tous" }, ...destinataires.map((d) => ({ valeur: d.id, label: d.nom }))]}
            value={filtreDestinataireId}
            onChange={setFiltreDestinataireId}
            defilement
          />
        )}

        {erreur && <Text className="mt-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton label="Exporter en PDF" onPress={exporterPdf} chargement={exportEnCours === "pdf"} className="mt-6" />
        {planEffectif === "business" && (
          <Bouton
            label="Exporter en Excel"
            variante="contour"
            onPress={exporterExcel}
            chargement={exportEnCours === "excel"}
            className="mt-3"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
