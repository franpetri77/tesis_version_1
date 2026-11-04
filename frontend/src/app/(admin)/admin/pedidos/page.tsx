// =============================================
// PÁGINA ADMIN: GESTIÓN DE PEDIDOS
// Contenedor de servidor: define el título y pasa el filtro de estado.
// Los datos se cargan en el navegador con el JWT del admin (PedidosView).
// =============================================

import type { Metadata } from "next";
import { PedidosView } from "./PedidosView";

export const metadata: Metadata = { title: "Pedidos — Admin" };

interface AdminOrdersPageProps {
  searchParams: { estado?: string };
}

export default function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  return <PedidosView statusFilter={searchParams.estado} />;
}
