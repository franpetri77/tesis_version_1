// =============================================
// LOADING SCREEN — TELE IMPORT S.A.
// Pantalla de carga reutilizable con identidad
// visual coherente con SplashScreen.
//
// USO 1 — Next.js loading.tsx (sin props):
//   <LoadingScreen />
//   Se muestra mientras Suspense resuelve y
//   Next.js la desmonta automáticamente.
//
// USO 2 — Carga programática (con isVisible):
//   <LoadingScreen isVisible={isLoading} message="Procesando..." />
//   isVisible=true  → aparece con fade-in
//   isVisible=false → animación de salida (600ms) y se desmonta
//
// =============================================

'use client';

import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  /**
   * Controla la visibilidad.
   * - Sin prop (undefined): siempre visible — para usar en loading.tsx de Next.js.
   * - true / false: modo controlado — fade-out cuando pasa a false.
   */
  isVisible?: boolean;
  /** Mensaje de estado mostrado bajo la tagline. */
  message?: string;
}

export function LoadingScreen({ isVisible, message }: LoadingScreenProps) {
  const isControlled = isVisible !== undefined;

  // Estado interno para manejar la animación de salida antes de desmontar
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (isVisible === false) {
      setExiting(true);
      const t = setTimeout(() => setGone(true), 680);
      return () => clearTimeout(t);
    }
    if (isVisible === true) {
      setGone(false);
      setExiting(false);
    }
  }, [isVisible]);

  if (gone) return null;

  return (
    <>
      {/* ── Keyframes propios — no dependen de Tailwind para evitar purge ── */}
      <style>{`
        @keyframes ls-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ls-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ls-line-draw {
          from { transform: scaleX(0); opacity: 0; }
          20%  { opacity: 1; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        @keyframes ls-glow-breathe {
          0%, 100% { opacity: 0.10; }
          50%      { opacity: 0.20; }
        }
        @keyframes ls-dots-bg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Barra indeterminada: scan de izquierda a derecha en loop */
        @keyframes ls-scan {
          0%   { transform: translateX(-120%); opacity: 0;   }
          12%  { opacity: 1;                                  }
          88%  { opacity: 1;                                  }
          100% { transform: translateX(500%);  opacity: 0;   }
        }
        /* Tres puntos animados en cascada */
        @keyframes ls-dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        /* Progress fill (solo para modo no-controlado / loading.tsx) */
        @keyframes ls-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      {/* ── Overlay principal ── */}
      <div
        role="status"
        aria-label="Cargando"
        aria-live="polite"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998, // bajo SplashScreen (9999), sobre todo lo demás
          backgroundColor: '#0d1b3e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: exiting ? 0 : 1,
          pointerEvents: exiting ? 'none' : 'all',
        }}
      >
        {/* Resplandor radial central — respira suavemente */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '560px', height: '420px',
            background:
              'radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 68%)',
            animation: 'ls-glow-breathe 3.5s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Grilla de puntos sutil */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(96,165,250,0.10) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            animation: 'ls-dots-bg 1s ease-out 0.1s both',
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
            maxWidth: '480px',
          }}
        >
          {/* Línea horizontal superior */}
          <div
            aria-hidden="true"
            style={{
              width: '100%', height: '1px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.45) 50%, transparent 100%)',
              marginBottom: '30px',
              animation: 'ls-fade-in 0.8s ease-out 0.2s both',
            }}
          />

          {/* Ícono Zap — idéntico al del header */}
          <div
            aria-hidden="true"
            style={{
              marginBottom: '16px',
              animation: 'ls-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both',
            }}
          >
            <svg
              width="28" height="28"
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
          <p
            style={{
              fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
              fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '0.13em',
              color: '#ffffff',
              margin: 0,
              lineHeight: 1,
              animation: 'ls-fade-up 0.85s cubic-bezier(0.16,1,0.3,1) 0.42s both',
            }}
          >
            TELE IMPORT
          </p>

          {/* S.A. */}
          <p
            style={{
              fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.42em',
              color: '#60a5fa',
              margin: '9px 0 0',
              animation: 'ls-fade-up 0.75s cubic-bezier(0.16,1,0.3,1) 0.56s both',
            }}
          >
            S · A
          </p>

          {/* Línea de acento */}
          <div
            aria-hidden="true"
            style={{
              marginTop: '20px',
              height: '1px', width: '48px',
              background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
              transformOrigin: 'center',
              borderRadius: '1px',
              animation: 'ls-line-draw 0.75s cubic-bezier(0.16,1,0.3,1) 0.70s both',
            }}
          />

          {/* Tagline / mensaje de estado */}
          <p
            style={{
              fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
              fontSize: '0.60rem',
              fontWeight: 400,
              letterSpacing: '0.16em',
              color: message ? 'rgba(148,163,184,0.85)' : 'rgba(148,163,184,0.55)',
              margin: '16px 0 0',
              textTransform: 'uppercase',
              animation: 'ls-fade-up 0.75s cubic-bezier(0.16,1,0.3,1) 0.84s both',
            }}
          >
            {message ?? 'Insumos Electrónicos y de Computación'}
          </p>

          {/* Tres puntos pulsantes — solo en modo controlado (indica carga activa real) */}
          {isControlled && (
            <div
              aria-hidden="true"
              style={{
                display: 'flex',
                gap: '7px',
                marginTop: '22px',
                animation: 'ls-fade-in 0.5s ease-out 1.0s both',
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    width: '4px', height: '4px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    animation: `ls-dot-bounce 1.3s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Línea horizontal inferior */}
          <div
            aria-hidden="true"
            style={{
              width: '100%', height: '1px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.45) 50%, transparent 100%)',
              marginTop: '30px',
              animation: 'ls-fade-in 0.8s ease-out 0.2s both',
            }}
          />
        </div>

        {/* ── Barra de progreso inferior ── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '2px',
            backgroundColor: 'rgba(23,37,84,0.6)',
            overflow: 'hidden',
          }}
        >
          {isControlled ? (
            /*
             * Modo controlado → barra indeterminada: scan en loop.
             * Indica actividad real sin prometer tiempo de finalización.
             */
            <div
              style={{
                height: '100%',
                width: '28%',
                background:
                  'linear-gradient(90deg, transparent 0%, #3b82f6 40%, #60a5fa 60%, transparent 100%)',
                animation: 'ls-scan 1.8s cubic-bezier(0.4,0,0.6,1) 0.3s infinite',
              }}
            />
          ) : (
            /*
             * Modo loading.tsx → barra de relleno gradual.
             * Sigue el estilo de SplashScreen para coherencia visual.
             */
            <div
              style={{
                height: '100%',
                background:
                  'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 60%, #60a5fa 100%)',
                animation: 'ls-fill 3s cubic-bezier(0.4,0,0.2,1) 0.2s both',
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
