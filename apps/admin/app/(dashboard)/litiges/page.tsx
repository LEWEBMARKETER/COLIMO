import StatutBadge from "@/components/StatutBadge";
import { courses, utilisateurs } from "@/lib/mockData";
import { COURSE_STATUS_LABELS, formatFCFA, ZONE_LABELS } from "@colimo/shared";

function nomUtilisateur(id: string): string {
  return utilisateurs.find((u) => u.id === id)?.nom ?? "—";
}

export default function LitigesPage() {
  const litiges = courses.filter((c) => c.statut === "litige");

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Litiges</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Courses signalées nécessitant une intervention</p>

      <div className="mt-6 space-y-3">
        {litiges.map((course) => (
          <div key={course.id} className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-colimo-neutre-fonce">
                  {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
                </p>
                <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
                  Client : {nomUtilisateur(course.clientId)} · Coursier :{" "}
                  {course.coursierId ? nomUtilisateur(course.coursierId) : "—"}
                </p>
                <p className="mt-1 text-sm text-colimo-neutre-fonce/70">{formatFCFA(course.prix)}</p>
              </div>
              <StatutBadge statut={course.statut} label={COURSE_STATUS_LABELS[course.statut]} />
            </div>
          </div>
        ))}

        {litiges.length === 0 && (
          <p className="rounded-2xl border border-dashed border-colimo-neutre-clair p-8 text-center text-colimo-neutre-fonce/50">
            Aucun litige en cours
          </p>
        )}
      </div>
    </div>
  );
}
