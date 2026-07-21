import { createContext, useContext, useState, type ReactNode } from "react";

// Pas d'auth réelle pour l'instant (OTP SMS = intégration différée) : ce contexte
// simule la session pour naviguer entre les vues Client / Coursier.
export type Role = "client" | "coursier" | null;

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole doit être utilisé dans un RoleProvider");
  return ctx;
}
