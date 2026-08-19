// =============================================
// LAYOUT RAÍZ DE LA APLICACIÓN
// Configura los providers globales: React Query, fuentes, metadata.
// Todos los layouts anidados heredan de este.
// =============================================

import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { CartToast } from "@/components/ui/CartToast";
import { SplashScreen } from "@/components/ui/SplashScreen";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Serif de contraste para títulos de piezas editoriales (presupuestos,
// secciones destacadas). Aporta un registro más cálido frente a la
// neutralidad de Inter, que se conserva para todo el texto corrido.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["SOFT", "WONK"],
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
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <Providers>
          <SplashScreen />
          {children}
          <CartToast />
        </Providers>
      </body>
    </html>
  );
}
