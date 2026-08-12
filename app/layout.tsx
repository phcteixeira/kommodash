import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kommodash — Relatórios Kommo CRM",
  description: "Dashboard de relatórios conectado à API da Kommo CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
