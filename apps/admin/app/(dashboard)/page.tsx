import StatCard from "@/components/StatCard";
import { coursiers, courses } from "@/lib/mockData";
import { formatFCFA } from "@colimo/shared";

export default function DashboardPage() {
  const coursesAujourdHui = courses.length;
  const coursiersActifs = coursiers.filter((c) => c.disponibilite).length;
  const litigesOuverts = courses.filter((c) => c.statut === "litige").length;
  const chiffreAffaires = courses
    .filter((c) => c.statut === "confirmee")
    .reduce((total, c) => total + c.prix, 0);

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Dashboard</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Vue d&apos;ensemble de l&apos;activité COLIMO</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses aujourd'hui" value={String(coursesAujourdHui)} />
        <StatCard label="Coursiers disponibles" value={String(coursiersActifs)} />
        <StatCard label="Litiges ouverts" value={String(litigesOuverts)} />
        <StatCard label="Chiffre d'affaires confirmé" value={formatFCFA(chiffreAffaires)} />
      </div>
    </div>
  );
}
