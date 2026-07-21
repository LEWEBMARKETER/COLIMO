interface StatCardProps {
  label: string;
  value: string;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
      <p className="text-sm text-colimo-neutre-fonce/70">{label}</p>
      <p className="mt-2 font-titre text-2xl font-semibold text-colimo-neutre-fonce">{value}</p>
    </div>
  );
}
