"use client";

// =============================================
// COMPONENTE: BOTONES PARA COMPARTIR
// WhatsApp, Facebook, X y copiar enlace. En dispositivos con
// la API de compartir del sistema se agrega "Más opciones".
// =============================================

import { useEffect, useRef, useState } from "react";
import { Link2, Check, Share2 } from "lucide-react";
import { shareLinks, type ShareNetwork } from "@/lib/utils/share";

interface ShareButtonsProps {
  url: string;
  text: string;
  title: string;
}

const button =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 motion-reduce:transition-none";

// Marcas en un solo color (heredan currentColor) para respetar el acento único.
function NetworkIcon({ network }: { network: ShareNetwork }) {
  const paths: Record<ShareNetwork, string> = {
    whatsapp:
      "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z",
    facebook:
      "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z",
    x: "M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d={paths[network]} />
    </svg>
  );
}

const NETWORKS: Array<{ id: ShareNetwork; label: string }> = [
  { id: "whatsapp", label: "Compartir por WhatsApp" },
  { id: "facebook", label: "Compartir en Facebook" },
  { id: "x", label: "Compartir en X" },
];

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Sigue con el método alternativo.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function ShareButtons({ url, text, title }: ShareButtonsProps) {
  const links = shareLinks(url, text);
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => clearTimeout(timer.current);
  }, []);

  async function handleCopy() {
    const ok = await copyText(url);
    setStatus(ok ? "copied" : "error");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2500);
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // El usuario canceló o el sistema no pudo compartir: no se muestra nada.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="mr-1 text-xs font-medium text-slate-500">Compartir</span>
      {NETWORKS.map(({ id, label }) => (
        <a
          key={id}
          href={links[id]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={button}
        >
          <NetworkIcon network={id} />
        </a>
      ))}
      <button type="button" onClick={handleCopy} aria-label="Copiar enlace" title="Copiar enlace" className={button}>
        {status === "copied" ? <Check className="h-4 w-4 text-brand-600" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
      </button>
      {canNativeShare && (
        <button type="button" onClick={handleNativeShare} aria-label="Más opciones para compartir" title="Más opciones" className={button}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <span role="status" aria-live="polite" className="text-xs text-slate-500">
        {status === "copied" ? "Enlace copiado" : status === "error" ? "No se pudo copiar el enlace" : ""}
      </span>
    </div>
  );
}
