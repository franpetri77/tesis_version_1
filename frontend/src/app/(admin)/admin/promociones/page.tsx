// =============================================
// PÁGINA ADMIN: GESTIÓN DE PROMOCIONES
// Contenedor de servidor: define el título.
// Los datos se cargan en el navegador con el JWT del admin (PromocionesView).
// =============================================

import type { Metadata } from "next";
import { PromocionesView } from "./PromocionesView";

export const metadata: Metadata = { title: "Promociones — Admin" };

export default function AdminPromotionsPage() {
  return <PromocionesView />;
}
