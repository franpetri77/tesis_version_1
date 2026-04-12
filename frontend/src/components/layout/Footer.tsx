// =============================================
// COMPONENTE: FOOTER
// Pie de página de la tienda.
// =============================================

import Link from "next/link";
import { Zap, MapPin, Mail, Phone, ExternalLink } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="container-main py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Columna 1: Marca */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[15px] font-bold text-white tracking-tight">
                Tele Import
                <span className="text-slate-500 font-normal text-xs ml-0.5">S.A.</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Insumos electrónicos y de computación para profesionales y
              entusiastas. Distribuidor mayorista y minorista.
            </p>
          </div>

          {/* Columna 2: Productos */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Productos</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/catalogo" className="hover:text-white transition-colors">
                  Catálogo completo
                </Link>
              </li>
              <li>
                <Link href="/catalogo?categoria=componentes" className="hover:text-white transition-colors">
                  Componentes
                </Link>
              </li>
              <li>
                <Link href="/catalogo?categoria=perifericos" className="hover:text-white transition-colors">
                  Periféricos
                </Link>
              </li>
              <li>
                <Link href="/catalogo?categoria=redes" className="hover:text-white transition-colors">
                  Redes
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Mi cuenta */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Mi cuenta</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Ingresar
                </Link>
              </li>
              <li>
                <Link href="/registro" className="hover:text-white transition-colors">
                  Crear cuenta
                </Link>
              </li>
              <li>
                <Link href="/perfil/pedidos" className="hover:text-white transition-colors">
                  Mis pedidos
                </Link>
              </li>
              <li>
                <Link href="/perfil" className="hover:text-white transition-colors">
                  Mi perfil
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                <span>Buenos Aires, Argentina</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 flex-shrink-0 text-slate-500" />
                <a
                  href="mailto:ventas@teleimport.com.ar"
                  className="hover:text-white transition-colors"
                >
                  ventas@teleimport.com.ar
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 flex-shrink-0 text-slate-500" />
                <span>(011) 4xxx-xxxx</span>
              </li>
            </ul>

            {/* Enlace Mercado Pago */}
            <div className="mt-5">
              <a
                href="https://www.mercadopago.com.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Pago seguro con Mercado Pago
              </a>
            </div>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>© {currentYear} Tele Import S.A. Todos los derechos reservados.</span>
          <span>Envío a todo el país · Lunes a viernes 9–18hs</span>
        </div>
      </div>
    </footer>
  );
}
