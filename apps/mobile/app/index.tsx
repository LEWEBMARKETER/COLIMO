import { Redirect } from "expo-router";
import { useRole } from "@/lib/RoleContext";

export default function Index() {
  const { role } = useRole();

  if (role === "client") return <Redirect href="/(client)" />;
  if (role === "coursier") return <Redirect href="/(coursier)/dashboard" />;
  return <Redirect href="/(auth)/login" />;
}
