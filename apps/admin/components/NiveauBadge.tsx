interface NiveauBadgeProps {
  nom: string;
  couleur: string;
  icone?: string | null;
}

export default function NiveauBadge({ nom, couleur, icone }: NiveauBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${couleur}1A`, color: couleur }}
    >
      {icone && <span>{icone}</span>}
      {nom}
    </span>
  );
}
