// =============================================
// LOADING: HOME
// Pantalla de carga con identidad de marca.
// Se muestra mientras se resuelve el Suspense
// del home (datos async de productos destacados).
// El SplashScreen de layout.tsx cubre los primeros
// 2.6s; este componente aparece si la carga demora más.
// =============================================

import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function HomeLoading() {
  return <LoadingScreen />;
}
