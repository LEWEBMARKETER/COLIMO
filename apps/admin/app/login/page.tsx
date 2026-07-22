"use client";

import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // TODO: brancher Supabase Auth (email/mot de passe admin) — écran UI seule pour l'instant.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

          <button
            type="submit"
            className="w-full rounded-lg bg-colimo-rouge px-4 py-2 text-sm font-semibold text-white transition hover:bg-colimo-rouge-fonce"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
