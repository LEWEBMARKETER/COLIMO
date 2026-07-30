import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COURSE_STATUS_LABELS, MODE_PAIEMENT_LABELS, ZONE_LABELS, formatFCFA, type Course, type Utilisateur } from "@colimo/shared";

function lignesExport(courses: Course[], utilisateurs: Utilisateur[]) {
  const nom = (id: string) => utilisateurs.find((u) => u.id === id)?.nom ?? "—";
  return courses.map((c) => ({
    "N° commande": c.numeroCommande,
    Client: nom(c.clientId),
    Coursier: c.coursierId ? nom(c.coursierId) : "—",
    Départ: ZONE_LABELS[c.zoneDepart],
    Arrivée: ZONE_LABELS[c.zoneArrivee],
    Prix: c.prix,
    Paiement: MODE_PAIEMENT_LABELS[c.modePaiement],
    Statut: COURSE_STATUS_LABELS[c.statut],
    Date: new Date(c.createdAt).toLocaleDateString("fr-FR"),
  }));
}

export function exporterCoursesExcel(courses: Course[], utilisateurs: Utilisateur[]) {
  const lignes = lignesExport(courses, utilisateurs);
  const feuille = XLSX.utils.json_to_sheet(lignes);
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, "Courses");
  XLSX.writeFile(classeur, `colimo-courses-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exporterCoursesPdf(courses: Course[], utilisateurs: Utilisateur[]) {
  const lignes = lignesExport(courses, utilisateurs);
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("COLIMO — Rapport des courses", 14, 16);
  doc.setFontSize(10);
  const total = courses.reduce((s, c) => s + c.prix, 0);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} — ${courses.length} courses — ${formatFCFA(total)}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [Object.keys(lignes[0] ?? {})],
    body: lignes.map((l) => Object.values(l)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [196, 30, 36] },
  });

  doc.save(`colimo-courses-${new Date().toISOString().slice(0, 10)}.pdf`);
}
