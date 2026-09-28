"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface GraphiqueBarresProps {
  titre: string;
  donnees: { label: string; valeur: number }[];
  formatValeur: (valeur: number) => string;
  couleur?: string;
}

// Un seul graphique en barres à la fois répond à une question précise
// (chiffre d'affaires OU volume de courses sur la période) — jamais un
// double axe pour superposer les deux échelles, voir le skill dataviz.
export default function GraphiqueBarres({ titre, donnees, formatValeur, couleur = "#C41E24" }: GraphiqueBarresProps) {
  return (
    <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
      <h3 className="font-titre text-sm font-semibold text-colimo-neutre-fonce">{titre}</h3>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={donnees} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2DA" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#2B262299" }}
              axisLine={{ stroke: "#E8E2DA" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#2B262299" }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v) => formatValeur(Number(v))}
            />
            <Tooltip
              cursor={{ fill: "#F5F1EC" }}
              formatter={(value) => [formatValeur(Number(value)), ""]}
              labelStyle={{ color: "#2B2622", fontWeight: 600 }}
              contentStyle={{ borderRadius: 12, borderColor: "#E8E2DA", fontSize: 12 }}
            />
            <Bar dataKey="valeur" fill={couleur} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
