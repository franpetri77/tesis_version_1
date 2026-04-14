"use client";

// =============================================
// SISTEMA DE MODALES DE AUTENTICACIÓN
// Agrupa todos los modales relacionados con auth:
// - Login exitoso
// - Confirmación de logout
// - Registro exitoso
// - Sesión expirada
// =============================================

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, LogOut, PartyPopper,
  ShieldAlert, ArrowRight, Home, HandMetal,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useModalStore } from "@/stores/modalStore";
import { useAuthStore } from "@/stores/authStore";

// ─── Re-exportamos el orquestador principal ───────────────────────────────────

/**
 * Renderiza el modal activo según el store.
 * Incluir una sola vez en el layout raíz de la app.
 */
export function AuthModals() {
  const { activeModal, payload, closeModal, openModal } = useModalStore();

  const router  = useRouter();
  const { user, clearUser } = useAuthStore();

  function confirmLogout() {
    const name = user?.first_name ?? "";
    localStorage.removeItem("tele_import_token");
    clearUser();
    // Muestra el modal de despedida antes de redirigir
    openModal("logout-success", { firstName: name });
  }

  return (
    <>
      {/* ─── 1. Login exitoso ─── */}
      <LoginSuccessModal
        isOpen={activeModal === "login-success"}
        firstName={payload.firstName ?? ""}
        onClose={closeModal}
      />

      {/* ─── 2. Confirmar cierre de sesión ─── */}
      <LogoutConfirmModal
        isOpen={activeModal === "logout-confirm"}
        onClose={closeModal}
        onConfirm={confirmLogout}
      />

      {/* ─── 3. Registro exitoso ─── */}
      <RegisterSuccessModal
        isOpen={activeModal === "register-success"}
        firstName={payload.firstName ?? ""}
        email={payload.email ?? ""}
        onClose={closeModal}
      />

      {/* ─── 4. Sesión expirada ─── */}
      <SessionExpiredModal
        isOpen={activeModal === "session-expired"}
        onClose={closeModal}
      />

      {/* ─── 5. Logout exitoso ─── */}
      <LogoutSuccessModal
        isOpen={activeModal === "logout-success"}
        firstName={payload.firstName ?? ""}
        onClose={() => { closeModal(); router.push("/"); }}
      />
    </>
  );
}

// ─── Modal 1: LOGIN EXITOSO ───────────────────────────────────────────────────

interface LoginSuccessModalProps {
  isOpen: boolean;
  firstName: string;
  onClose: () => void;
}

function LoginSuccessModal({ isOpen, firstName, onClose }: LoginSuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xs">
      <div className="px-7 py-8 text-center">
        {/* Ícono animado */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-emerald-100 animate-pulse opacity-60" />
          <div className="relative w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
        </div>

        {/* Texto */}
        <h2 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight">
          ¡Bienvenido{firstName ? `, ${firstName}` : ""}!
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Iniciaste sesión correctamente. Ya podés ver tus pedidos, tu carrito y mucho más.
        </p>

        {/* CTA */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700
                     text-white text-sm font-semibold transition-all shadow-sm
                     hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          Continuar navegando
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal 2: CONFIRMAR LOGOUT ────────────────────────────────────────────────

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function LogoutConfirmModal({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xs">
      <div className="px-7 py-8 text-center">
        {/* Ícono */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-slate-100" />
          <div className="relative w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
            <LogOut className="w-7 h-7 text-slate-600" strokeWidth={1.75} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight">
          ¿Cerrás sesión?
        </h2>
        <p className="text-sm text-slate-500">
          Tendrás que volver a ingresar para acceder a tu cuenta.
        </p>

        {/* Botones */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            className="w-full py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800
                       text-white text-sm font-semibold transition-all shadow-sm
                       hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            Sí, cerrar sesión
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-5 rounded-xl border border-slate-200
                       text-slate-700 text-sm font-semibold hover:bg-slate-50
                       transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal 3: REGISTRO EXITOSO ────────────────────────────────────────────────

interface RegisterSuccessModalProps {
  isOpen: boolean;
  firstName: string;
  email: string;
  onClose: () => void;
}

function RegisterSuccessModal({ isOpen, firstName, email, onClose }: RegisterSuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      {/* Franja de acento superior */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-700 via-brand-500 to-emerald-500 rounded-t-2xl" />

      <div className="px-7 py-7 text-center">
        {/* Ícono con confetti */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-brand-50 opacity-80" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-brand-700
                          flex items-center justify-center shadow-lg shadow-brand-600/30">
            <PartyPopper className="w-8 h-8 text-white" strokeWidth={1.75} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1 tracking-tight">
          ¡Tu cuenta fue creada!
        </h2>
        {firstName && (
          <p className="text-brand-600 font-semibold text-sm mb-3">{firstName}</p>
        )}

        {/* Resumen */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-left mt-3 space-y-2">
          <Row icon="✉️" label="Email registrado" value={email} />
          <Row icon="🔒" label="Contraseña" value="Configurada correctamente" />
          <Row icon="🛒" label="Carrito" value="Listo para usar" />
        </div>

        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
          Ya podés empezar a comprar. Tu información está protegida y segura.
        </p>

        {/* CTAs */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700
                       text-white text-sm font-semibold transition-all shadow-sm
                       hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            Explorar el catálogo
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href="/perfil"
            onClick={onClose}
            className="w-full py-2.5 px-5 rounded-xl border border-slate-200
                       text-slate-600 text-sm font-medium hover:bg-slate-50
                       transition-colors flex items-center justify-center gap-2"
          >
            Ver mi perfil
          </Link>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal 4: SESIÓN EXPIRADA ─────────────────────────────────────────────────

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SessionExpiredModal({ isOpen, onClose }: SessionExpiredModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xs" disableBackdropClose>
      <div className="px-7 py-8 text-center">
        {/* Ícono */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-amber-50 animate-pulse opacity-70" />
          <div className="relative w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-600" strokeWidth={1.75} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight">
          Sesión expirada
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Tu sesión venció por inactividad. Ingresá nuevamente para continuar.
        </p>

        {/* Botones */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/login"
            onClick={onClose}
            className="w-full py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700
                       text-white text-sm font-semibold transition-all shadow-sm
                       hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            Ingresar de nuevo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            onClick={onClose}
            className="w-full py-2.5 px-5 rounded-xl border border-slate-200
                       text-slate-600 text-sm font-medium hover:bg-slate-50
                       transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal 5: LOGOUT EXITOSO ─────────────────────────────────────────────────

interface LogoutSuccessModalProps {
  isOpen: boolean;
  firstName: string;
  onClose: () => void;
}

function LogoutSuccessModal({ isOpen, firstName, onClose }: LogoutSuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xs" disableBackdropClose>
      <div className="px-7 py-8 text-center">
        {/* Ícono */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-slate-100 animate-pulse opacity-60" />
          <div className="relative w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center shadow-md">
            <HandMetal className="w-7 h-7 text-white" strokeWidth={1.75} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight">
          {firstName ? `¡Hasta pronto, ${firstName}!` : "¡Hasta pronto!"}
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Cerraste sesión correctamente. Tus datos están guardados y seguros.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800
                     text-white text-sm font-semibold transition-all shadow-sm
                     hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
                     flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Volver al inicio
        </button>
      </div>
    </Modal>
  );
}

// ─── Helper interno ───────────────────────────────────────────────────────────

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-[12.5px] text-slate-700 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
