import type { SupabaseClient } from "@supabase/supabase-js";
import { getCoursierByUtilisateurId, getUtilisateur } from "../../supabase/queries";
import { attribuerBadge, evaluerBadgesAutomatiques, getBadgesCoursier, getCatalogueBadges, retirerBadge } from "../badges";
import { calculerNiveau, definirNiveauCoursier, getCatalogueNiveaux } from "../niveaux";
import { calculerStatistiquesCoursier } from "../statistics";

/**
 * Point d'entrée unique de l'automatisation Coursiers : recalcule les
 * badges automatiques et le niveau d'un utilisateur. Prend un utilisateurId
 * générique et se résout elle-même en coursier — no-op silencieux si ce
 * n'est pas un coursier, ce qui permet de l'appeler indifféremment depuis
 * un flux déclenché par un client ou par un coursier (ex. NotationForm est
 * utilisé dans les deux sens) sans avoir à le savoir à l'avance.
 */
export async function recalculerBadgesEtNiveau(client: SupabaseClient, utilisateurId: string): Promise<void> {
  const coursier = await getCoursierByUtilisateurId(client, utilisateurId);
  if (!coursier) return;

  const utilisateur = await getUtilisateur(client, utilisateurId);
  if (!utilisateur) return;

  const stats = calculerStatistiquesCoursier(coursier, utilisateur);

  const [catalogueBadges, badgesActuels, catalogueNiveaux] = await Promise.all([
    getCatalogueBadges(client),
    getBadgesCoursier(client, coursier.id),
    getCatalogueNiveaux(client),
  ]);

  const { aAttribuer, aRetirer } = evaluerBadgesAutomatiques(stats, coursier.statutVerification, catalogueBadges, badgesActuels);
  await Promise.all([
    ...aAttribuer.map((badge) => attribuerBadge(client, coursier.id, badge.id)),
    ...aRetirer.map((attribution) => retirerBadge(client, attribution.id)),
  ]);

  const niveau = calculerNiveau(stats.nombreLivraisons, catalogueNiveaux);
  if (niveau && niveau.id !== coursier.niveauId) {
    await definirNiveauCoursier(client, coursier.id, niveau.id);
  }
}
