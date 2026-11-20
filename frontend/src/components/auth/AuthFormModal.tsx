"use client";

// =============================================
// MODAL DE AUTENTICACIÓN
// Controlado desde modalStore con activeModal="auth".
// Pasos (payload.authTab):
// - "intro":    aviso "Todavía no iniciaste sesión" con Crear cuenta / Ingresar
//               (se usa al intentar comprar sin sesión)
// - "login" | "register": formularios compartidos de AuthForms
// - "forgot":   pedir enlace para restablecer la contraseña
// Si payload.redirectTo está definido, al ingresar o registrarse el modal
// se cierra y se sigue a esa ruta (p. ej. /checkout) sin tocar el carrito.
// =============================================

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, ShoppingBag,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoginForm, RegisterForm, EMAIL_REGEX } from "@/components/auth/AuthForms";
import { forgotPassword } from "@/lib/api/auth";
import { useModalStore } from "@/stores/modalStore";
import type { User } from "@/types";

type Mode = "intro" | "login" | "register" | "forgot";

export function AuthFormModal() {
  const router = useRouter();
  const { activeModal, payload, closeModal, openModal } = useModalStore();
  const titleId = useId();

  const isOpen = activeModal === "auth";
  const redirectTo = payload.redirectTo;

  function finish(me: User, kind: "login" | "register") {
    if (redirectTo) {
      // Compra en curso: cerrar y seguir; el carrito del invitado pasa a la cuenta.
      closeModal();
      router.push(redirectTo);
      return;
    }
    if (kind === "login") openModal("login-success", { firstName: me.first_name });
    else openModal("register-success", { firstName: me.first_name, email: me.email });
  }

  return (
    <Modal isOpen={isOpen} onClose={closeModal} maxWidth="max-w-md" labelledBy={titleId}>
      {/* El contenido se monta al abrir con el paso inicial ya resuelto: así
          el foco inicial cae en el paso correcto y cada apertura empieza limpia. */}
      <AuthFlow
        initialMode={payload.authTab ?? "login"}
        redirectTo={redirectTo}
        titleId={titleId}
        finish={finish}
      />
    </Modal>
  );
}

interface AuthFlowProps {
  initialMode: Mode;
  redirectTo?: string;
  titleId: string;
  finish: (me: User, kind: "login" | "register") => void;
}

function AuthFlow({ initialMode, redirectTo, titleId, finish }: AuthFlowProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  // Email compartido entre formularios (p. ej. al pasar de registro a login)
  const [sharedEmail, setSharedEmail] = useState("");

  return (
    <>
      {/* ─── Paso 1: aviso de sesión ─── */}
      {mode === "intro" && (
        <div className="px-7 pt-9 pb-7">
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-5">
            <ShoppingBag className="w-5 h-5 text-brand-600" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 id={titleId} className="text-xl font-bold text-slate-900 tracking-tight">
            Todavía no iniciaste sesión
          </h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Registrate o ingresá para terminar la compra. Tu carrito queda guardado.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" size="lg" onClick={() => setMode("register")}>
              Crear cuenta
            </Button>
            <Button type="button" variant="primary" size="lg" onClick={() => setMode("login")}>
              Ingresar
            </Button>
          </div>
        </div>
      )}

      {/* ─── Tabs (solo en los formularios de ingreso y registro) ─── */}
      {(mode === "login" || mode === "register") && (
        <div className="flex px-7 pt-6 pr-14 gap-1">
          <TabButton active={mode === "login"} onClick={() => setMode("login")}>
            Ingresar
          </TabButton>
          <TabButton active={mode === "register"} onClick={() => setMode("register")}>
            Crear cuenta
          </TabButton>
        </div>
      )}

      {mode !== "intro" && (
        <div className="px-7 pb-7 pt-5">
          {mode === "login" && (
            <>
              <div className="mb-5">
                <h2 id={titleId} className="text-xl font-bold text-slate-900 tracking-tight">
                  {redirectTo ? "Ingresá para terminar la compra" : "Bienvenido de nuevo"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  ¿No tenés cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                  >
                    Registrate gratis
                  </button>
                </p>
              </div>
              <LoginForm
                initialEmail={sharedEmail}
                onSuccess={(me) => finish(me, "login")}
                forgotAction={
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                }
              />
            </>
          )}
          {mode === "register" && (
            <>
              <div className="mb-5">
                <h2 id={titleId} className="text-xl font-bold text-slate-900 tracking-tight">
                  Creá tu cuenta
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  ¿Ya tenés cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                  >
                    Iniciá sesión
                  </button>
                </p>
              </div>
              <RegisterForm
                onSuccess={(me) => finish(me, "register")}
                onEmailTaken={(email) => { setSharedEmail(email); setMode("login"); }}
              />
            </>
          )}
          {mode === "forgot" && (
            <ForgotForm
              titleId={titleId}
              initialEmail={sharedEmail}
              goLogin={() => setMode("login")}
            />
          )}
        </div>
      )}
    </>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-slate-400 hover:text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Formulario de RECUPERAR CONTRASEÑA ──────────────────────────────────────────

interface ForgotFormProps {
  titleId: string;
  initialEmail?: string;
  goLogin: () => void;
}

function ForgotForm({ titleId, initialEmail = "", goLogin }: ForgotFormProps) {
  const [email, setEmail]     = useState(initialEmail);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Ingresá un email válido");
      return;
    }
    setIsLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      // No revelamos detalles; el backend responde igual exista o no el email
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  // Pantalla de confirmación tras enviar
  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 id={titleId} className="text-lg font-bold text-slate-900 mb-1.5">Revisá tu correo</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Si <span className="font-medium text-slate-700">{email.trim().toLowerCase()}</span> tiene
          una cuenta, te enviamos un enlace para restablecer tu contraseña. El enlace vence en 1 hora.
        </p>
        <button
          type="button"
          onClick={goLogin}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Ingresar
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={goLogin}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      <div className="mb-5">
        <h2 id={titleId} className="text-xl font-bold text-slate-900 tracking-tight">
          Recuperar contraseña
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          autoComplete="email"
          autoFocus
        />

        {error && (
          <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          isLoading={isLoading}
          className="mt-1 gap-2"
        >
          {!isLoading && "Enviar enlace"}
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
    </>
  );
}
