// =============================================
// PÁGINA: DASHBOARD ADMIN
// Contenedor de servidor: define el título.
// Las métricas se cargan en el navegador con el JWT del admin (DashboardView).
// =============================================

import type { Metadata } from "next";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = { title: "Dashboard — Admin" };

export default function AdminDashboardPage() {
  return <DashboardView />;
}
