import { CGU, CGU_DERNIERE_MAJ } from "@colimo/shared";
import PageLegale from "@/components/PageLegale";

export default function CguScreen() {
  return <PageLegale titre="Conditions générales d'utilisation" derniereMaj={CGU_DERNIERE_MAJ} sections={CGU} />;
}
