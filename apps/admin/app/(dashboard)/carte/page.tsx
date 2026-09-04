"use client";

import { useEffect, useMemo, useState } from "react";
import {
  STATUT_COURSIER_LABELS,
  souscrireToutesPositionsCoursiers,
  type CoursierAvecStatutEffectif,
  type PositionCoursier,
} from "@colimo/shared";
import CarteLive from "@/components/CarteLive";
import StatutBadge from "@/components/StatutBadge";
import { createClient } from "@/lib/supabaseClient";
import { getCourses, getCoursiersAvecStatutEffectif, getPositionsCoursiers } from "@/lib/api";
import type { CoursierCartePoint } from "@/components/CarteLiveInner";

// Un coursier n'est géolocalisé (positions_coursiers) que pendant une
// course active côté app (cf. supabase/migrations/0038) — cette carte ne
// peut donc afficher une position live que pour les coursiers "occupés",
// jamais pour ceux simplement "en ligne" en attente d'une course.
export default function CartePage() {
  const [coursiers, setCoursiers] = useState<CoursierAvecStatutEffectif[]>([]);
  const [positions, setPositions] = useState<Record<string, PositionCoursier>>({});
  const [numerosCommandeParCoursier, setNumerosCommandeParCoursier] = useState<Record<string, string>>({});

  async function charger() {
    const [coursiersData, positionsData, courses] = await Promise.all([
      getCoursiersAvecStatutEffectif(),
      getPositionsCoursiers(),
      getCourses(),
    ]);
    setCoursiers(coursiersData);
    setPositions(Object.fromEntries(positionsData.map((p) => [p.coursierId, p])));
    const parCoursier: Record<string, string> = {};
    for (const course of courses) {
      if (course.coursierId && ["acceptee", "retrait", "en_cours"].includes(course.statut)) {
        parCoursier[course.coursierId] = course.numeroCommande;
      }
    }
    setNumerosCommandeParCoursier(parCoursier);
  }

  useEffect(() => {
    charger();
    // Statuts/assignations et positions n'évoluent pas au même rythme : un
    // rafraîchissement périodique complète le canal Realtime (positions
    // uniquement) pour rester cohérent sans multiplier les abonnements.
    const intervalle = setInterval(charger, 20000);

    const client = createClient();
    const canal = souscrireToutesPositionsCoursiers(client, (position) => {
      setPositions((precedent) => ({ ...precedent, [position.coursierId]: position }));
    });

    return () => {
      clearInterval(intervalle);
      client.removeChannel(canal);
    };
  }, []);

  const disponibles = coursiers.filter((c) => c.statutEffectif === "en_ligne");
  const enCourse = coursiers.filter((c) => c.statutEffectif === "occupe");
  const horsLigne = coursiers.filter((c) => c.statutEffectif === "hors_ligne");

  const pointsCarte: CoursierCartePoint[] = useMemo(
    () =>
      enCourse
        .map((c) => {
          const position = positions[c.utilisateurId];
          if (!position) return null;
          const nom = [c.utilisateur?.prenom, c.utilisateur?.nom].filter(Boolean).join(" ") || "Coursier";
          return {
            id: c.utilisateurId,
            nom,
            latitude: position.latitude,
            longitude: position.longitude,
            numeroCommande: numerosCommandeParCoursier[c.utilisateurId] ?? null,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null),
    [enCourse, positions, numerosCommandeParCoursier]
  );

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-titre text-2xl font-bold text-colimo-neutre-fonce">Carte en direct</h1>
          <p className="mt-1 font-texte text-sm text-colimo-neutre-fonce/60">
            Position en temps réel des coursiers actuellement en course, et vue d&apos;ensemble des zones desservies.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl border border-colimo-neutre-clair bg-white px-4 py-2 text-center">
            <p className="font-titre text-lg font-bold text-emerald-600">{enCourse.length}</p>
            <p className="font-texte text-xs text-colimo-neutre-fonce/50">En course</p>
          </div>
          <div className="rounded-xl border border-colimo-neutre-clair bg-white px-4 py-2 text-center">
            <p className="font-titre text-lg font-bold text-colimo-rouge">{disponibles.length}</p>
            <p className="font-texte text-xs text-colimo-neutre-fonce/50">Disponibles</p>
          </div>
          <div className="rounded-xl border border-colimo-neutre-clair bg-white px-4 py-2 text-center">
            <p className="font-titre text-lg font-bold text-colimo-neutre-fonce/40">{horsLigne.length}</p>
            <p className="font-texte text-xs text-colimo-neutre-fonce/50">Hors ligne</p>
          </div>
        </div>
      </div>

      <CarteLive coursiersActifs={pointsCarte} />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-4">
          <h2 className="mb-3 font-texte-medium text-sm font-semibold text-colimo-neutre-fonce">
            En course ({enCourse.length})
          </h2>
          <div className="flex flex-col gap-2">
            {enCourse.length === 0 && <p className="font-texte text-xs text-colimo-neutre-fonce/50">Aucun coursier en course actuellement.</p>}
            {enCourse.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-texte text-colimo-neutre-fonce">
                  {[c.utilisateur?.prenom, c.utilisateur?.nom].filter(Boolean).join(" ") || "—"}
                  {numerosCommandeParCoursier[c.utilisateurId] && (
                    <span className="ml-2 font-texte text-xs text-colimo-neutre-fonce/50">
                      {numerosCommandeParCoursier[c.utilisateurId]}
                    </span>
                  )}
                </span>
                {!positions[c.utilisateurId] && (
                  <span className="font-texte text-xs text-colimo-neutre-fonce/40">position en attente…</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-4">
          <h2 className="mb-3 font-texte-medium text-sm font-semibold text-colimo-neutre-fonce">
            Disponibles ({disponibles.length})
          </h2>
          <div className="flex flex-col gap-2">
            {disponibles.length === 0 && <p className="font-texte text-xs text-colimo-neutre-fonce/50">Aucun coursier disponible actuellement.</p>}
            {disponibles.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-texte text-colimo-neutre-fonce">
                  {[c.utilisateur?.prenom, c.utilisateur?.nom].filter(Boolean).join(" ") || "—"}
                </span>
                <StatutBadge statut={c.statutEffectif} label={STATUT_COURSIER_LABELS[c.statutEffectif]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
