// =============================================
// LAYOUT RAÍZ DE LA APLICACIÓN
// Configura los providers globales: React Query, fuentes, metadata.
// Todos los layouts anidados heredan de este.
// =============================================

import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { CartToast } from "@/components/ui/CartToast";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { siteUrl } from "@/lib/utils/share";

// Metadata base del sitio (puede ser sobreescrita por cada página)
export const metadata: Metadata = {
  // Base para que las URL relativas de Open Graph y canonical salgan absolutas
  metadataBase: new URL(siteUrl()),
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
    <html lang="es">
      <head>
        <link
          rel="preload"
          href="/fonts/inter-latin-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
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
