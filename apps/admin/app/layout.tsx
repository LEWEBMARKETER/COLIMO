import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COLIMO — Back-office",
  description: "Administration COLIMO — coursiers, courses, litiges",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-texte">{children}</body>
    </html>
  );
}
