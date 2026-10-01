import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EthosGuard",
  description: "Análise configurável de ética cristã baseada em categorias explícitas."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

