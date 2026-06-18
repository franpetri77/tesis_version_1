"use client";

// =============================================
// COMPONENTE: SHARE BUTTONS
// Permite compartir el producto en redes sociales (WhatsApp, Facebook, X)
// y copiar el enlace directo. Usa la URL de la página actual.
// =============================================

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

interface ShareButtonsProps {
  productName: string;
}

// Iconos de marca como SVG inline (evita depender de versiones de lucide).
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.585 0 11.946-5.359 11.949-11.945a11.821 11.821 0 00-3.421-8.4" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ShareButtons({ productName }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => (typeof window !== "undefined" ? window.location.href : "");
  const shareText = `Mirá este producto en Tele Import: ${productName}`;

  function openPopup(url: string) {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=520");
  }

  function shareWhatsApp() {
    openPopup(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${getUrl()}`)}`);
  }
  function shareFacebook() {
    openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`);
  }
  function shareX() {
    openPopup(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getUrl())}`
    );
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si clipboard falla (contexto inseguro), abrimos el compartir nativo.
      if (navigator.share) {
        try {
          await navigator.share({ title: productName, text: shareText, url: getUrl() });
        } catch {
          /* el usuario canceló */
        }
      }
    }
  }

  const btn =
    "w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors";

  return (
    <div className="flex items-center gap-2 flex-wrap pt-1">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Share2 className="w-3.5 h-3.5" />
        Compartir:
      </span>

      <button onClick={shareWhatsApp} className={`${btn} hover:text-white hover:bg-[#25D366] hover:border-[#25D366]`} aria-label="Compartir por WhatsApp">
        <WhatsAppIcon />
      </button>
      <button onClick={shareFacebook} className={`${btn} hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2]`} aria-label="Compartir en Facebook">
        <FacebookIcon />
      </button>
      <button onClick={shareX} className={`${btn} hover:text-white hover:bg-slate-900 hover:border-slate-900`} aria-label="Compartir en X">
        <XIcon />
      </button>
      <button onClick={copyLink} className={`${btn} hover:text-brand-700 hover:border-brand-300 hover:bg-brand-50`} aria-label="Copiar enlace">
        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
      </button>

      {copied && <span className="text-xs text-emerald-600 font-medium">¡Enlace copiado!</span>}
    </div>
  );
}
