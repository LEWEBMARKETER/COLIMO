import { CONFIDENTIALITE, CONFIDENTIALITE_DERNIERE_MAJ } from "@colimo/shared";
import PageLegale from "@/components/PageLegale";

export default function ConfidentialiteScreen() {
  return (
    <PageLegale
      titre="Politique de confidentialité"
      derniereMaj={CONFIDENTIALITE_DERNIERE_MAJ}
      sections={CONFIDENTIALITE}
    />
  );
}
