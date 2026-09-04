"use client";

import dynamic from "next/dynamic";
import type { CoursierCartePoint } from "./CarteLiveInner";

const CarteLiveInner = dynamic(() => import("./CarteLiveInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-colimo-neutre-fonce/50">
      Chargement de la carte...
    </div>
  ),
});

interface CarteLiveProps {
  coursiersActifs: CoursierCartePoint[];
  hauteur?: number;
}

export default function CarteLive({ coursiersActifs, hauteur = 480 }: CarteLiveProps) {
  return (
    <div style={{ height: hauteur }} className="overflow-hidden rounded-2xl border border-colimo-neutre-clair">
      <CarteLiveInner coursiersActifs={coursiersActifs} />
    </div>
  );
}
