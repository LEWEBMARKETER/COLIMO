import StatCard from "@/components/StatCard";
import { courses, zones } from "@/lib/mockData";
import { formatFCFA, ZONE_LABELS } from "@colimo/shared";

export default function StatistiquesPage() {
  const totalCourses = courses.length;
  const prixMoyen = totalCourses ? Math.round(courses.reduce((s, c) => s + c.prix, 0) / totalCourses) : 0;

  const parZone = zones
    .map((zone) => ({ zone, count: courses.filter((c) => c.zoneDepart === zone).length }))
    .filter((z) => z.count > 0);

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Statistiques</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Vue agrégée — graphiques et exports détaillés à venir
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Courses totales" value={String(totalCourses)} />
        <StatCard label="Prix moyen" value={formatFCFA(prixMoyen)} />
        <StatCard label="Zones actives" value={String(parZone.length)} />
      </div>

      <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Répartition par zone de départ</h2>
        <ul className="mt-4 space-y-2">
          {parZone.map(({ zone, count }) => (
            <li key={zone} className="flex items-center justify-between text-sm">
              <span>{ZONE_LABELS[zone]}</span>
              <span className="font-medium">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
