"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/", label: "Dashboard" },
  { href: "/coursiers", label: "Coursiers" },
  { href: "/courses", label: "Courses" },
  { href: "/litiges", label: "Litiges" },
  { href: "/statistiques", label: "Statistiques" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-colimo-neutre-clair bg-white">
      <div className="px-5 py-6">
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
    </aside>
  );
}
