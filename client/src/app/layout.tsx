import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "../components/NavBar";

export const metadata: Metadata = {
  title: "App LIVO",
  description: "Marmitas congeladas — combos e avulsas, peça pelo app",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <NavBar />
          <div className="page">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
