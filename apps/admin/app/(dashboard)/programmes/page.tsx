"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatutBadge from "@/components/StatutBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { creerProgramme, getParticipantsProgramme, getProgrammes } from "@/lib/api";
import {
  PROGRAM_STATUS_LABELS,
  PROGRAM_TARGET_TYPE_LABELS,
  calculerStatsProgramme,
  type Program,
  type ProgramAvecStats,
  type ProgramTargetType,
} from "@colimo/shared";

const CIBLES: ProgramTargetType[] = ["merchant", "courier", "customer", "all"];

function slugifier(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<ProgramAvecStats[]>([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [cible, setCible] = useState<ProgramTargetType>("merchant");
  const [avantages, setAvantages] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [dateFin, setDateFin] = useState("");

  async function charger() {
    const liste = await getProgrammes();
    const avecStats = await Promise.all(
      liste.map(async (p) => {
        const participants = await getParticipantsProgramme(p.id);
        return calculerStatsProgramme(p, participants);
      })
    );
    setProgrammes(avecStats);
  }

  useEffect(() => {
    charger().finally(() => setChargement(false));
  }, []);

  async function creer() {
    if (!nom.trim()) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const nouveau: Program = await creerProgramme({
        name: nom.trim(),
        slug: slugifier(nom.trim()),
        description: description.trim() || undefined,
        targetType: cible,
        benefits: avantages
          .split("\n")
          .map((ligne) => ligne.trim())
          .filter(Boolean),
        maxParticipants: maxParticipants ? Number(maxParticipants) : null,
        endDate: dateFin ? new Date(dateFin).toISOString() : null,
      });
      setProgrammes((prev) => [calculerStatsProgramme(nouveau, []), ...prev]);
      setNom("");
      setDescription("");
      setAvantages("");
      setMaxParticipants("");
      setDateFin("");
      setAfficherFormulaire(false);
    } catch {
      setErreur("Impossible de créer ce programme (nom déjà utilisé ?).");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Programmes</h1>
          <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
            Campagnes d&apos;inscription destinées aux commerces, coursiers ou particuliers
          </p>
        </div>
        <button
          onClick={() => setAfficherFormulaire((v) => !v)}
          className="shrink-0 rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
        >
          {afficherFormulaire ? "Annuler" : "Créer un programme"}
        </button>
      </div>

      {afficherFormulaire && (
        <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Nouveau programme</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom du programme"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Courte description"
              rows={2}
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm sm:col-span-2"
            />
            <Select value={cible} onValueChange={(v) => setCible(v as ProgramTargetType)}>
              <SelectTrigger className="h-auto rounded-md border-colimo-neutre-clair px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CIBLES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {PROGRAM_TARGET_TYPE_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              type="number"
              placeholder="Nombre maximum (optionnel)"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            />
            <input
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              type="date"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            />
            <textarea
              value={avantages}
              onChange={(e) => setAvantages(e.target.value)}
              placeholder={"Avantages, un par ligne\nEx. Inscription gratuite"}
              rows={4}
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          {erreur && <p className="mt-3 text-sm text-colimo-rouge">{erreur}</p>}
          <p className="mt-3 text-xs text-colimo-neutre-fonce/50">
            Le programme est créé en brouillon — publiez-le (statut Actif) depuis sa fiche.
          </p>
          <button
            onClick={creer}
            disabled={envoiEnCours || !nom.trim()}
            className="mt-3 rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
          >
            Créer le programme
          </button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>Programme</TableHead>
              <TableHead>Cible</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programmes.map((p) => (
              <TableRow key={p.id} className="border-colimo-neutre-clair">
                <TableCell className="font-medium text-colimo-neutre-fonce">{p.name}</TableCell>
                <TableCell>{PROGRAM_TARGET_TYPE_LABELS[p.targetType]}</TableCell>
                <TableCell className="[font-variant-numeric:tabular-nums]">
                  {p.participantsAcceptes}
                  {p.maxParticipants !== null ? ` / ${p.maxParticipants}` : ""}
                </TableCell>
                <TableCell>
                  <StatutBadge statut={p.status} label={PROGRAM_STATUS_LABELS[p.status]} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/programmes/${p.id}`}
                    className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                  >
                    Gérer
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!chargement && programmes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-colimo-neutre-fonce/50">
                  Aucun programme créé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
