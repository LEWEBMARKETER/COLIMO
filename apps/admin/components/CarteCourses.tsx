"use client";

import dynamic from "next/dynamic";
import type { Course } from "@colimo/shared";

const CarteCoursesInner = dynamic(() => import("./CarteCoursesInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-colimo-neutre-fonce/50">
      Chargement de la carte...
    </div>
  ),
});

interface CarteCoursesProps {
  courses: Course[];
  nomUtilisateur: (id: string) => string;
  hauteur?: number;
}

export default function CarteCourses({ courses, nomUtilisateur, hauteur = 420 }: CarteCoursesProps) {
  return (
    <div style={{ height: hauteur }} className="overflow-hidden rounded-2xl border border-colimo-neutre-clair">
      <CarteCoursesInner courses={courses} nomUtilisateur={nomUtilisateur} />
    </div>
  );
}
