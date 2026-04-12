// =============================================
// LAYOUT PÚBLICO
// Envuelve las páginas de acceso público (catálogo, detalle de producto, home)
// con el Header y Footer de la tienda.
// =============================================

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
