interface BadgePillProps {
  nom: string;
  icone: string;
  couleur: string;
}

// Les couleurs de badges (or/argent/bronze, rouge COLIMO, etc.) sont
// arbitraires et définies par l'admin — contrairement à StatutBadge, une
// lookup Tailwind par valeur connue ne convient pas ici, d'où le style
// inline à partir de la couleur stockée en base.
export default function BadgePill({ nom, icone, couleur }: BadgePillProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${couleur}1A`, color: couleur }}
    >
      <span>{icone}</span>
      {nom}
    </span>
  );
}
