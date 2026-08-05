import EcranNotifications from "@/components/EcranNotifications";
import { useAuth } from "@/lib/AuthContext";

export default function NotificationsCoursierScreen() {
  const { session } = useAuth();
  if (!session) return null;
  return <EcranNotifications utilisateurId={session.user.id} />;
}
