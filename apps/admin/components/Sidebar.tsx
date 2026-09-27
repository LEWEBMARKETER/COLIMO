"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { getMonPoleAdmin } from "@/lib/api";
import { poleADroitSurPage, type PoleAdmin } from "@colimo/shared";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
      { href: "/programmes", label: "Programmes" },
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
  const [ouvertMobile, setOuvertMobile] = useState(false);

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

  // Contenu de navigation partagé entre la sidebar desktop fixe et le tiroir
  // mobile (Sheet) — un seul endroit à maintenir pour les liens, jamais
  // deux listes qui pourraient diverger. `onNavigate` referme le tiroir
  // mobile après un clic ; sans effet sur la sidebar desktop (jamais fournie).
  function contenuNavigation(onNavigate?: () => void) {
    return (
      <>
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
                      onClick={onNavigate}
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
            onClick={onNavigate}
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
      </>
    );
  }

  return (
    <>
      {/* Desktop (≥ lg) — sidebar fixe inchangée */}
      <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-colimo-neutre-clair bg-white lg:flex">
        {contenuNavigation()}
      </aside>

      {/* Mobile/tablette (< lg) — barre + tiroir, mêmes liens, même contrôle d'accès */}
      <div className="flex items-center gap-3 border-b border-colimo-neutre-clair bg-white px-4 py-3 lg:hidden">
        <Sheet open={ouvertMobile} onOpenChange={setOuvertMobile}>
          <SheetTrigger asChild>
            <button
              aria-label="Ouvrir le menu"
              className="rounded-lg p-2 text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-64 flex-col p-0">
            {contenuNavigation(() => setOuvertMobile(false))}
          </SheetContent>
        </Sheet>
        <Image src="/icons/icon-192.png" alt="" width={26} height={26} className="rounded-md" />
        <span className="font-titre text-lg font-bold text-colimo-rouge">COLIMO</span>
      </div>
    </>
  );
}
