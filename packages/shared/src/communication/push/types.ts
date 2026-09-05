// Abonnement Web Push d'un appareil (un par couple navigateur/service de
// push) — cf. supabase/migrations/0041_notifications_push_web.sql.
export interface AbonnementPush {
  id: string;
  utilisateurId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: string;
}
