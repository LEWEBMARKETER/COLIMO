"use client";

import { useEffect, useMemo, useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCodesPromo, getCourses, creerCodePromo, patchCodePromo } from "@/lib/api";
import type { CodePromo, Course, TypeReductionPromo } from "@colimo/shared";

export default function PromotionsPage() {
  const [codes, setCodes] = useState<CodePromo[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [code, setCode] = useState("");
  const [typeReduction, setTypeReduction] = useState<TypeReductionPromo>("pourcentage");
  const [valeur, setValeur] = useState("");
  const [usageMax, setUsageMax] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    Promise.all([getCodesPromo(), getCourses()])
      .then(([c, courses]) => {
        setCodes(c);
        setCourses(courses);
      })
      .finally(() => setChargement(false));
  }, []);

  const usageReel = useMemo(
    () => (codePromoId: string) => courses.filter((c) => c.codePromoId === codePromoId).length,
    [courses]
  );

  async function creer() {
    if (!code.trim() || !valeur) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const nouveau = await creerCodePromo({
        code: code.trim(),
        typeReduction,
        valeur: Number(valeur),
        usageMax: usageMax ? Number(usageMax) : undefined,
        dateFin: dateFin ? new Date(dateFin).toISOString() : undefined,
      });
      setCodes((prev) => [nouveau, ...prev]);
      setCode("");
      setValeur("");
      setUsageMax("");
      setDateFin("");
    } catch {
      setErreur("Impossible de créer ce code (existe peut-être déjà).");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function toggleActif(promo: CodePromo) {
    const misAJour = await patchCodePromo(promo.id, { actif: !promo.actif });
    setCodes((prev) => prev.map((c) => (c.id === promo.id ? misAJour : c)));
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Promotions</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Codes promo applicables à la publication d&apos;une course</p>

      <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Créer un code</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm uppercase"
          />
          <Select value={typeReduction} onValueChange={(v) => setTypeReduction(v as TypeReductionPromo)}>
            <SelectTrigger className="h-auto rounded-md border-colimo-neutre-clair px-3 py-2 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pourcentage">Pourcentage (%)</SelectItem>
              <SelectItem value="montant_fixe">Montant fixe (FCFA)</SelectItem>
            </SelectContent>
          </Select>
          <input
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            type="number"
            placeholder="Valeur"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          />
          <input
            value={usageMax}
            onChange={(e) => setUsageMax(e.target.value)}
            type="number"
            placeholder="Usage max (optionnel)"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          />
          <input
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            type="date"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          />
        </div>
        {erreur && <p className="mt-3 text-sm text-colimo-rouge">{erreur}</p>}
        <button
          onClick={creer}
          disabled={envoiEnCours || !code.trim() || !valeur}
          className="mt-4 rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
        >
          Créer le code
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>Code</TableHead>
              <TableHead>Réduction</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((promo) => (
              <TableRow key={promo.id} className="border-colimo-neutre-clair">
                <TableCell className="font-mono">{promo.code}</TableCell>
                <TableCell>
                  {promo.typeReduction === "pourcentage" ? `${promo.valeur}%` : `${promo.valeur} FCFA`}
                </TableCell>
                <TableCell>
                  {usageReel(promo.id)} {promo.usageMax ? `/ ${promo.usageMax}` : ""}
                </TableCell>
                <TableCell>
                  {promo.dateFin ? new Date(promo.dateFin).toLocaleDateString("fr-FR") : "—"}
                </TableCell>
                <TableCell>
                  <StatutBadge statut={promo.actif ? "actif" : "suspendu"} label={promo.actif ? "Actif" : "Inactif"} />
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleActif(promo)}
                    className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                  >
                    {promo.actif ? "Désactiver" : "Activer"}
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {!chargement && codes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-colimo-neutre-fonce/50">
                  Aucun code promo créé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
