"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { getMonPoleAdmin } from "@/lib/api";
import { poleADroitSurPage, type PoleAdmin } from "@colimo/shared";

const GROUPES = [
  {
    label: "Activité",
    liens: [
      { href: "/", label: "Dashboard" },
      { href: "/carte", label: "Carte en direct" },
      { href: "/courses", label: "Courses" },
      { href: "/paiements", label: "Paiements" },
      { href: "/litiges", label: "Litiges" },
      { href: "/annulations", label: "Annulations" },
    ],
  },
  {
    label: "Comptes",
    liens: [
      { href: "/clients", label: "Clients" },
      { href: "/commercants", label: "Commerçants" },
      { href: "/coursiers", label: "Coursiers" },
      { href: "/administrateurs", label: "Administrateurs" },
    ],
  },
  {
    label: "Croissance",
    liens: [
      { href: "/promotions", label: "Promotions" },
      { href: "/communication", label: "Communication Center" },
    ],
  },
  {
    label: "Pilotage",
    liens: [
      { href: "/statistiques", label: "Statistiques" },
      { href: "/journal-activite", label: "Journal d'activité" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pole, setPole] = useState<PoleAdmin | null>(null);

  useEffect(() => {
    getMonPoleAdmin().then((profil) => setPole(profil?.pole ?? null));
  }, []);

  // Filtrage cosmétique par pôle — le vrai contrôle d'accès est le
  // middleware (server-side). Tant que le pôle n'est pas encore chargé,
  // n'affiche que "Dashboard"/"Mon compte" pour éviter un flash de liens
  // inaccessibles.
  const groupesVisibles = GROUPES.map((groupe) => ({
    ...groupe,
    liens: groupe.liens.filter((lien) => poleADroitSurPage(pole, lien.href)),
  })).filter((groupe) => groupe.liens.length > 0);

  async function seDeconnecter() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-colimo-neutre-clair bg-white">
      <div className="flex items-center gap-2 px-5 py-6">
        <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="rounded-md" />
        <span className="font-titre text-xl font-bold text-colimo-rouge">COLIMO</span>
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3">
        {groupesVisibles.map((groupe) => (
          <div key={groupe.label}>
            <p className="px-3 pb-1.5 font-texte text-[11px] font-medium uppercase tracking-wide text-colimo-neutre-fonce/40">
              {groupe.label}
            </p>
            <div className="flex flex-col gap-1">
              {groupe.liens.map((lien) => {
                const actif = pathname === lien.href;
                return (
                  <Link
                    key={lien.href}
                    href={lien.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      actif
                        ? "bg-colimo-rouge-clair text-colimo-rouge"
                        : "text-colimo-neutre-fonce/80 hover:bg-colimo-neutre-clair"
                    }`}
                  >
                    {lien.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mx-3 mb-5 flex flex-col gap-1">
        <Link
          href="/mon-compte"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            pathname === "/mon-compte"
              ? "bg-colimo-rouge-clair text-colimo-rouge"
              : "text-colimo-neutre-fonce/60 hover:bg-colimo-neutre-clair"
          }`}
        >
          Mon compte
        </Link>
        <button
          onClick={seDeconnecter}
          className="rounded-lg px-3 py-2 text-left text-sm font-medium text-colimo-neutre-fonce/60 hover:bg-colimo-neutre-clair"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
