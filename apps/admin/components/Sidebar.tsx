"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

const LIENS = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/commercants", label: "Commerçants" },
  { href: "/coursiers", label: "Coursiers" },
  { href: "/courses", label: "Courses" },
  { href: "/promotions", label: "Promotions" },
  { href: "/litiges", label: "Litiges" },
  { href: "/statistiques", label: "Statistiques" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {LIENS.map((lien) => {
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
      </nav>
      <button
        onClick={seDeconnecter}
        className="mx-3 mb-5 rounded-lg px-3 py-2 text-left text-sm font-medium text-colimo-neutre-fonce/60 hover:bg-colimo-neutre-clair"
      >
        Se déconnecter
      </button>
    </aside>
  );
}
