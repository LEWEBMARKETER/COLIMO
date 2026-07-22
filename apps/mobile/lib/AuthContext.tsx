import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getCoursierByUtilisateurId,
  getUtilisateur,
  type Coursier,
  type Utilisateur,
} from "@colimo/shared";
import { supabase } from "./supabaseClient";

interface AuthContextValue {
  session: Session | null;
  utilisateur: Utilisateur | null;
  coursier: Coursier | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [coursier, setCoursier] = useState<Coursier | null>(null);
  const [loading, setLoading] = useState(true);

  async function chargerProfil(userId: string) {
    const profil = await getUtilisateur(supabase, userId);
    setUtilisateur(profil);
    if (profil?.type === "coursier") {
      setCoursier(await getCoursierByUtilisateurId(supabase, userId));
    } else {
      setCoursier(null);
    }
  }

  async function refreshProfile() {
    if (session?.user) await chargerProfil(session.user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await chargerProfil(data.session.user.id);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nouvelleSession) => {
      setSession(nouvelleSession);
      if (nouvelleSession?.user) {
        await chargerProfil(nouvelleSession.user.id);
      } else {
        setUtilisateur(null);
        setCoursier(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, utilisateur, coursier, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
