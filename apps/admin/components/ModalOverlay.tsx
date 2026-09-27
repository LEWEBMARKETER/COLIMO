"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface ModalOverlayProps {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

// Patron overlay + panneau partagé par DetailCourseModal et
// ValidationLivraisonModal — un seul endroit à animer plutôt que deux
// copies du même markup. Entrée uniquement (pas d'AnimatePresence/exit) :
// les deux appelants démontent déjà le composant en conditionnel, une
// sortie animée demanderait de faire remonter cet état dans courses/page.tsx,
// hors périmètre de ce changement.
export default function ModalOverlay({ onClose, children, maxWidth = "max-w-md" }: ModalOverlayProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className={`max-h-[85vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white p-6 shadow-lg`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
