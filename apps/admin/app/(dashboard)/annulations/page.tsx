"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCommercantsBruts, getCourses, getHistoriqueAnnulations, getUtilisateurs } from "@/lib/api";
import {
  calculerPlanEffectif,
  COURSE_STATUS_LABELS,
  ROLE_ANNULATION_LABELS,
  type Commercant,
  type Course,
  type HistoriqueAnnulation,
  type RoleAnnulation,
  type Utilisateur,
} from "@colimo/shared";

const ROLES_FILTRE: RoleAnnulation[] = ["client_particulier", "client_commerce", "admin"];

export default function AnnulationsPage() {
  const [historique, setHistorique] = useState<HistoriqueAnnulation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [commercants, setCommercants] = useState<Commercant[]>([]);
  const [chargement, setChargement] = useState(true);

  const [filtreRole, setFiltreRole] = useState<RoleAnnulation | "tous">("tous");
  const [filtreUtilisateur, setFiltreUtilisateur] = useState<string>("tous");

  useEffect(() => {
    Promise.all([getHistoriqueAnnulations(), getCourses({ statut: "annulee" }), getUtilisateurs(), getCommercantsBruts()])
      .then(([h, c, u, commercantsBruts]) => {
        setHistorique(h);
        setCourses(c);
        setUtilisateurs(u);
        setCommercants(commercantsBruts);
      })
      .finally(() => setChargement(false));
  }, []);

  function estClientBusiness(utilisateurId: string): boolean {
    const commerce = commercants.find((c) => c.utilisateurId === utilisateurId);
    return commerce ? calculerPlanEffectif(commerce) === "business" : false;
  }

  const numeroCommande = useMemo(
    () => (courseId: string) => courses.find((c) => c.id === courseId)?.numeroCommande ?? courseId,
    [courses]
  );

  const nomUtilisateur = useMemo(
    () => (id: string) => utilisateurs.find((u) => u.id === id)?.nom ?? "—",
    [utilisateurs]
  );

  const historiqueFiltre = useMemo(
    () =>
      historique.filter(
        (h) =>
          (filtreRole === "tous" || h.role === filtreRole) &&
          (filtreUtilisateur === "tous" || h.utilisateurId === filtreUtilisateur)
      ),
    [historique, filtreRole, filtreUtilisateur]
  );

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Annulations</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Historique de toutes les annulations de courses</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Select value={filtreRole} onValueChange={(v) => setFiltreRole(v as RoleAnnulation | "tous")}>
          <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les rôles</SelectItem>
            {ROLES_FILTRE.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_ANNULATION_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtreUtilisateur} onValueChange={setFiltreUtilisateur}>
          <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les utilisateurs</SelectItem>
            {utilisateurs.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>N° commande</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Commentaire</TableHead>
              <TableHead>Statut précédent → nouveau</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historiqueFiltre.map((h) => (
              <TableRow key={h.id} className="border-colimo-neutre-clair">
                <TableCell className="font-mono text-xs text-colimo-neutre-fonce/70">{numeroCommande(h.courseId)}</TableCell>
                <TableCell>
                  {nomUtilisateur(h.utilisateurId)}
                  {h.role === "client_commerce" && estClientBusiness(h.utilisateurId) && (
                    <span className="ml-1.5 rounded-full bg-colimo-rouge-clair px-2 py-0.5 text-xs font-medium text-colimo-rouge">
                      Business
                    </span>
                  )}
                </TableCell>
                <TableCell>{ROLE_ANNULATION_LABELS[h.role]}</TableCell>
                <TableCell>{h.motif}</TableCell>
                <TableCell className="text-colimo-neutre-fonce/70">{h.commentaire ?? "—"}</TableCell>
                <TableCell className="text-xs text-colimo-neutre-fonce/70">
                  {COURSE_STATUS_LABELS[h.statutPrecedent]} → {COURSE_STATUS_LABELS[h.nouveauStatut]}
                </TableCell>
                <TableCell className="text-xs text-colimo-neutre-fonce/70">
                  {new Date(h.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
              </TableRow>
            ))}
            {!chargement && historiqueFiltre.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-colimo-neutre-fonce/50">
                  Aucune annulation pour ce filtre
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
