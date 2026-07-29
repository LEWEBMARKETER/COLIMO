const COULEURS: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-800",
  valide: "bg-emerald-100 text-emerald-800",
  rejete: "bg-red-100 text-red-800",
  acceptee: "bg-blue-100 text-blue-800",
  en_cours: "bg-blue-100 text-blue-800",
  livree: "bg-indigo-100 text-indigo-800",
  confirmee: "bg-emerald-100 text-emerald-800",
  annulee: "bg-gray-200 text-gray-700",
  litige: "bg-red-100 text-red-800",
  actif: "bg-emerald-100 text-emerald-800",
  suspendu: "bg-red-100 text-red-800",
};

export default function StatutBadge({ statut, label }: { statut: string; label: string }) {
  const classes = COULEURS[statut] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
