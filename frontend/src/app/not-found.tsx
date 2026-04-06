// =============================================
// PÁGINA 404 - NO ENCONTRADO
// Se muestra cuando se accede a una ruta inexistente.
// =============================================

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-8xl font-bold text-brand-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-slate-900 mb-2">
        Página no encontrada
      </h2>
      <p className="text-slate-500 mb-8 max-w-md">
        La página que buscás no existe o fue movida.
      </p>
      <Link href="/">
        <Button variant="primary" size="lg">
          Volver al inicio
        </Button>
      </Link>
    </div>
  );
}
