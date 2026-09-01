import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App LIVO",
  description: "Marmitas congeladas — combos e avulsas, peça pelo app",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
