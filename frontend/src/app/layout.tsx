// =============================================
// LAYOUT RAÍZ DE LA APLICACIÓN
// Configura los providers globales: React Query, fuentes, metadata.
// Todos los layouts anidados heredan de este.
// =============================================

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { CartToast } from "@/components/ui/CartToast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Metadata base del sitio (puede ser sobreescrita por cada página)
export const metadata: Metadata = {
  title: {
    template: "%s | Tele Import S.A.",
    default: "Tele Import S.A. — Insumos Electrónicos y de Computación",
  },
  description:
    "Tienda online de insumos electrónicos y de computación. Componentes, periféricos, cables y más.",
  keywords: ["electrónica", "computación", "insumos", "componentes", "tele import"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Tele Import S.A.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <Providers>
          {children}
          <CartToast />
        </Providers>
      </body>
    </html>
  );
}
