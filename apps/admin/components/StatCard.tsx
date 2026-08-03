interface StatCardProps {
  label: string;
  value: string;
  sombre?: boolean;
}

export default function StatCard({ label, value, sombre = false }: StatCardProps) {
  if (sombre) {
    return (
      <div className="rounded-2xl bg-colimo-noir-clair p-5">
        <p className="font-texte text-[11px] font-medium uppercase tracking-wide text-white/50">{label}</p>
        <p className="mt-2 font-titre text-3xl font-bold text-white [font-variant-numeric:tabular-nums]">{value}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
      <p className="font-texte text-[11px] font-medium uppercase tracking-wide text-colimo-neutre-fonce/50">
        {label}
      </p>
      <p className="mt-2 font-titre text-2xl font-semibold text-colimo-neutre-fonce [font-variant-numeric:tabular-nums]">
        {value}
      </p>
    </div>
  );
}
