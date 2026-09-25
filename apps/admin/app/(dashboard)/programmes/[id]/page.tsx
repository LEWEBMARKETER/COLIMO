"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import StatutBadge from "@/components/StatutBadge";
import StatCard from "@/components/StatCard";
import { getParticipantsProgramme, getProgramme, patchProgramme, traiterCandidatureProgramme } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  PROGRAM_PARTICIPANT_STATUS_LABELS,
  PROGRAM_STATUS_LABELS,
  PROGRAM_TARGET_TYPE_LABELS,
  calculerStatsProgramme,
  type Program,
  type ProgramAvecStats,
  type ProgramParticipantAvecUtilisateur,
  type ProgramParticipantStatus,
  type ProgramStatus,
  type ProgramTargetType,
} from "@colimo/shared";

const STATUTS_PROGRAMME: ProgramStatus[] = ["draft", "active", "closed", "archived"];
const CIBLES: ProgramTargetType[] = ["merchant", "courier", "customer", "all"];
const FILTRES: { valeur: ProgramParticipantStatus | "tous"; label: string }[] = [
  { valeur: "tous", label: "Tous" },
  { valeur: "pending", label: "En attente" },
  { valeur: "approved", label: "Acceptés" },
  { valeur: "rejected", label: "Refusés" },
];

export default function FicheProgrammePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const programmeId = params.id;

  const [programme, setProgramme] = useState<Program | null>(null);
  const [participants, setParticipants] = useState<ProgramParticipantAvecUtilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<ProgramParticipantStatus | "tous">("tous");

  const [edition, setEdition] = useState(false);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [cible, setCible] = useState<ProgramTargetType>("merchant");
  const [avantages, setAvantages] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [statut, setStatut] = useState<ProgramStatus>("draft");

  async function charger() {
    const [p, participantsList] = await Promise.all([getProgramme(programmeId), getParticipantsProgramme(programmeId)]);
    setProgramme(p);
    setParticipants(participantsList);
    if (p) {
      setNom(p.name);
      setDescription(p.description ?? "");
      setCible(p.targetType);
      setAvantages(p.benefits.join("\n"));
      setMaxParticipants(p.maxParticipants !== null ? String(p.maxParticipants) : "");
      setDateFin(p.endDate ? p.endDate.slice(0, 10) : "");
      setStatut(p.status);
    }
  }

  useEffect(() => {
    charger().finally(() => setChargement(false));
  }, [programmeId]);

  const stats: ProgramAvecStats | null = useMemo(
    () => (programme ? calculerStatsProgramme(programme, participants) : null),
    [programme, participants]
  );

  const participantsFiltres = useMemo(
    () => (filtre === "tous" ? participants : participants.filter((p) => p.status === filtre)),
    [participants, filtre]
  );

  async function enregistrer() {
    if (!programme) return;
    const misAJour = await patchProgramme(programme.id, {
      name: nom.trim(),
      description: description.trim() || null,
      targetType: cible,
      benefits: avantages
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      endDate: dateFin ? new Date(dateFin).toISOString() : null,
      status: statut,
    });
    setProgramme(misAJour);
    setEdition(false);
  }

  async function traiter(participant: ProgramParticipantAvecUtilisateur, decision: "approved" | "rejected") {
    try {
      const misAJour = await traiterCandidatureProgramme(participant.id, decision);
      setParticipants((prev) => prev.map((p) => (p.id === misAJour.id ? { ...p, ...misAJour } : p)));
      if (programme) {
        await notifierEvenement(decision === "approved" ? "programme_candidature_acceptee" : "programme_candidature_refusee", {
          destinataire: participant.userId,
          utilisateurId: participant.userId,
          variables: { nom_programme: programme.name },
        });
      }
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de traiter cette candidature.");
    }
  }

  if (chargement) {
    return <p className="text-sm text-colimo-neutre-fonce/60">Chargement…</p>;
  }

  if (!programme || !stats) {
    return <p className="text-sm text-colimo-neutre-fonce/60">Programme introuvable.</p>;
  }

  const lienProfil = programme.targetType === "courier" ? "/coursiers" : programme.targetType === "customer" ? "/clients" : "/commercants";

  return (
    <div>
      <button onClick={() => router.push("/programmes")} className="mb-4 text-sm text-colimo-neutre-fonce/60 hover:text-colimo-rouge">
        ← Retour à la liste
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">{programme.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatutBadge statut={programme.status} label={PROGRAM_STATUS_LABELS[programme.status]} />
            <span className="text-xs text-colimo-neutre-fonce/50">{PROGRAM_TARGET_TYPE_LABELS[programme.targetType]}</span>
          </div>
        </div>
        <button
          onClick={() => setEdition((v) => !v)}
          className="shrink-0 rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
        >
          {edition ? "Annuler" : "Modifier"}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Participants acceptés" value={stats.maxParticipants !== null ? `${stats.participantsAcceptes} / ${stats.maxParticipants}` : String(stats.participantsAcceptes)} />
        <StatCard label="Candidatures en attente" value={String(stats.participantsEnAttente)} />
        <StatCard label="Places restantes" value={stats.placesRestantes !== null ? String(stats.placesRestantes) : "Illimité"} />
        <StatCard label="Date de fin" value={programme.endDate ? new Date(programme.endDate).toLocaleDateString("fr-FR") : "—"} />
      </div>

      {stats.complet && (
        <p className="mt-4 rounded-lg bg-colimo-rouge-clair px-3 py-2 text-xs text-colimo-rouge">
          ⚠️ Programme complet — aucune nouvelle acceptation n&apos;est possible tant qu&apos;une place ne se libère pas.
        </p>
      )}

      {!edition ? (
        <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Informations</p>
          <p className="text-sm text-colimo-neutre-fonce/70">{programme.description || "Aucune description"}</p>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-colimo-neutre-fonce/50">Avantages</p>
            <ul className="mt-2 list-inside list-disc text-sm text-colimo-neutre-fonce/80">
              {programme.benefits.length === 0 ? <li className="list-none text-colimo-neutre-fonce/50">Aucun avantage configuré</li> : null}
              {programme.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Modifier le programme</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={cible}
              onChange={(e) => setCible(e.target.value as ProgramTargetType)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            >
              {CIBLES.map((c) => (
                <option key={c} value={c}>
                  {PROGRAM_TARGET_TYPE_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as ProgramStatus)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            >
              {STATUTS_PROGRAMME.map((s) => (
                <option key={s} value={s}>
                  {PROGRAM_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
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
              placeholder="Avantages, un par ligne"
              rows={4}
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          <button
            onClick={enregistrer}
            className="mt-3 rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
          >
            Enregistrer
          </button>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="font-titre text-base font-semibold text-colimo-neutre-fonce">Participants</p>
          <div className="flex gap-1">
            {FILTRES.map((f) => (
              <button
                key={f.valeur}
                onClick={() => setFiltre(f.valeur)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filtre === f.valeur ? "bg-colimo-rouge text-white" : "text-colimo-neutre-fonce/60 hover:bg-colimo-neutre-clair"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <tr>
                <th className="px-4 py-3 font-medium">Commerce / utilisateur</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Date de candidature</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participantsFiltres.map((p) => {
                const nomAffiche = p.utilisateur ? (p.utilisateur.prenom ? `${p.utilisateur.prenom} ${p.utilisateur.nom}` : p.utilisateur.nom) : "—";
                return (
                  <tr key={p.id} className="border-b border-colimo-neutre-clair last:border-0">
                    <td className="px-4 py-3 font-medium text-colimo-neutre-fonce">{nomAffiche}</td>
                    <td className="px-4 py-3 text-colimo-neutre-fonce/70">{p.utilisateur?.telephone ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">{new Date(p.appliedAt).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={p.status} label={PROGRAM_PARTICIPANT_STATUS_LABELS[p.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {p.status === "pending" && (
                          <>
                            <button
                              onClick={() => traiter(p, "approved")}
                              disabled={stats.complet}
                              title={stats.complet ? "Programme complet" : undefined}
                              className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() => traiter(p, "rejected")}
                              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        <Link
                          href={lienProfil}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          Voir le profil
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {participantsFiltres.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                    Aucune candidature
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
