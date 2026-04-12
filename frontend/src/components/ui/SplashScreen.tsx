// =============================================
// SPLASH SCREEN — TELE IMPORT S.A.
// Pantalla de bienvenida inicial de marca.
// Se muestra al cargar la app y desaparece
// con una transición fluida hacia el contenido.
//
// Sin props → auto-dismiss a los 2.6s (comportamiento original).
// isVisible prop → modo controlado (para uso programático).
// =============================================

'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  /**
   * Controla la visibilidad externamente.
   * - Sin prop: auto-dismiss a los 2.6s.
   * - false: inicia el fade-out inmediatamente.
   */
  isVisible?: boolean;
}

export function SplashScreen({ isVisible }: SplashScreenProps = {}) {
  const [fadingOut, setFadingOut] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Modo controlado: reacciona al prop isVisible
    if (isVisible === false) {
      setFadingOut(true);
      const t = setTimeout(() => setGone(true), 680);
      return () => clearTimeout(t);
    }
    if (isVisible === true) {
      setGone(false);
      setFadingOut(false);
      return;
    }

    // Modo auto (sin prop): timer original
    const t1 = setTimeout(() => setFadingOut(true), 2600);
    const t2 = setTimeout(() => setGone(true), 3250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isVisible]);

  if (gone) return null;

  return (
    <>
      <style>{`
        @keyframes ti-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ti-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ti-line-draw {
          from { transform: scaleX(0); opacity: 0; }
          20%  { opacity: 1; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        @keyframes ti-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes ti-glow-breathe {
          0%, 100% { opacity: 0.12; }
          50%       { opacity: 0.22; }
        }
        @keyframes ti-dots-appear {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ── Overlay principal ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#0d1b3e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: fadingOut ? 0 : 1,
          pointerEvents: fadingOut ? 'none' : 'all',
        }}
      >
        {/* Resplandor radial central */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '640px',
            height: '480px',
            background:
              'radial-gradient(ellipse at center, rgba(37,99,235,0.18) 0%, transparent 68%)',
            animation: 'ti-glow-breathe 3.5s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Grilla de puntos sutil */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(96,165,250,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            animation: 'ti-dots-appear 1.2s ease-out 0.1s both',
            pointerEvents: 'none',
          }}
        />

        {/* ── Contenido centrado ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 32px',
            width: '100%',
            maxWidth: '520px',
          }}
        >
          {/* Línea horizontal superior */}
          <div
            style={{
              width: '100%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 50%, transparent 100%)',
              marginBottom: '36px',
              animation: 'ti-fade-in 0.8s ease-out 0.25s both',
            }}
          />

          {/* Ícono Zap — coherente con el header */}
          <div
            style={{
              marginBottom: '18px',
              animation: 'ti-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.38s both',
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block' }}
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>

          {/* Nombre de empresa */}
          <h1
            style={{
              fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
              fontSize: 'clamp(2rem, 5.5vw, 3.25rem)',
              fontWeight: 800,
              letterSpacing: '0.13em',
              color: '#ffffff',
              margin: 0,
              lineHeight: 1,
              animation: 'ti-fade-up 0.85s cubic-bezier(0.16,1,0.3,1) 0.52s both',
            }}
          >
            TELE IMPORT
          </h1>

          {/* S.A. */}
          <p
            style={{
              fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.45em',
              color: '#60a5fa',
              margin: '10px 0 0',
              animation: 'ti-fade-up 0.75s cubic-bezier(0.16,1,0.3,1) 0.68s both',
            }}
          >
            S · A
          </p>

          {/* Línea de acento central */}
          <div
            style={{
              marginTop: '22px',
              height: '1px',
              width: '52px',
              background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
              transformOrigin: 'center',
              borderRadius: '1px',
              animation: 'ti-line-draw 0.75s cubic-bezier(0.16,1,0.3,1) 0.82s both',
            }}
          />

          {/* Tagline */}
          <p
            style={{
              fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
              fontSize: '0.63rem',
              fontWeight: 400,
              letterSpacing: '0.18em',
              color: 'rgba(148,163,184,0.65)',
              margin: '18px 0 0',
              textTransform: 'uppercase',
              animation: 'ti-fade-up 0.75s cubic-bezier(0.16,1,0.3,1) 0.96s both',
            }}
          >
            Insumos Electrónicos y de Computación
          </p>

          {/* Línea horizontal inferior */}
          <div
            style={{
              width: '100%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 50%, transparent 100%)',
              marginTop: '36px',
              animation: 'ti-fade-in 0.8s ease-out 0.25s both',
            }}
          />
        </div>

        {/* ── Barra de progreso inferior ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'rgba(23,37,84,0.6)',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 60%, #60a5fa 100%)',
              animation: 'ti-progress 2.4s cubic-bezier(0.4,0,0.6,1) 0.2s both',
            }}
          />
        </div>
      </div>
    </>
  );
}
