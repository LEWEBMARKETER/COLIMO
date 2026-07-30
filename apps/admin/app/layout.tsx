import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COLIMO — Back-office",
  description: "Administration COLIMO — coursiers, courses, litiges",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-texte">{children}</body>
    </html>
  );
}
