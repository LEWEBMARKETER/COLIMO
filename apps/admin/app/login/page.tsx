"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setEnvoiEnCours(false);
    if (error) {
      setErreur("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-colimo-fond px-4">
      <div className="w-full max-w-sm rounded-2xl border border-colimo-neutre-clair bg-white p-8 shadow-sm">
        <Image src="/logo-colimo.png" alt="COLIMO" width={200} height={57} priority />
        <p className="mt-3 text-sm text-colimo-neutre-fonce/70">Back-office administrateur</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-colimo-neutre-fonce">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none focus:ring-1 focus:ring-colimo-rouge"
              placeholder="admin@colimo.ga"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-colimo-neutre-fonce">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none focus:ring-1 focus:ring-colimo-rouge"
              placeholder="••••••••"
            />
          </div>

          {erreur && <p className="text-sm text-colimo-rouge">{erreur}</p>}

          <button
            type="submit"
            disabled={envoiEnCours}
            className="w-full rounded-lg bg-colimo-rouge px-4 py-2 text-sm font-semibold text-white transition hover:bg-colimo-rouge-fonce disabled:opacity-60"
          >
            {envoiEnCours ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
