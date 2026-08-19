"use client";

// =============================================
// MODAL DE AUTENTICACIÓN (LOGIN + REGISTRO)
// Modal con dos pestañas que reemplaza a las páginas
// /login y /registro, manteniendo el layout general.
// Se controla desde modalStore con activeModal="auth"
// y payload.authTab = "login" | "register".
// =============================================

import { useState, useEffect } from "react";
import {
  Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { login, register, forgotPassword } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useModalStore } from "@/stores/modalStore";
import type { User } from "@/types";

const TOKEN_KEY = "tele_import_token";

type Mode = "login" | "register" | "forgot";

export function AuthFormModal() {
  const { activeModal, payload, closeModal, openModal } = useModalStore();
  const setUser = useAuthStore((s) => s.setUser);

  const isOpen = activeModal === "auth";
  const [mode, setMode] = useState<Mode>("login");
  // Email compartido entre formularios (p. ej. al pasar de registro a login)
  const [sharedEmail, setSharedEmail] = useState("");

  // Sincroniza el modo con el payload cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMode(payload.authTab ?? "login");
      setSharedEmail("");
    }
  }, [isOpen, payload.authTab]);

  return (
    <Modal isOpen={isOpen} onClose={closeModal} maxWidth="max-w-md">
      {/* Franja de acento superior */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-700 via-brand-500 to-emerald-500 rounded-t-2xl" />

      {/* ─── Tabs (ocultas en modo "olvidé mi contraseña") ─── */}
      {mode !== "forgot" && (
        <div className="flex px-7 pt-6 gap-1">
          <TabButton active={mode === "login"} onClick={() => setMode("login")}>
            Ingresar
          </TabButton>
          <TabButton active={mode === "register"} onClick={() => setMode("register")}>
            Crear cuenta
          </TabButton>
        </div>
      )}

      <div className="px-7 pb-7 pt-5">
        {mode === "login" && (
          <LoginForm
            initialEmail={sharedEmail}
            onSuccess={(firstName) => openModal("login-success", { firstName })}
            goRegister={() => setMode("register")}
            goForgot={() => setMode("forgot")}
            setUser={setUser}
          />
        )}
        {mode === "register" && (
          <RegisterForm
            onSuccess={(firstName, email) =>
              openModal("register-success", { firstName, email })
            }
            goLogin={(email) => { if (email) setSharedEmail(email); setMode("login"); }}
            setUser={setUser}
          />
        )}
        {mode === "forgot" && (
          <ForgotForm
            initialEmail={sharedEmail}
            goLogin={() => setMode("login")}
          />
        )}
      </div>
    </Modal>
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

// ─── Formulario de LOGIN ────────────────────────────────────────────────────────

interface LoginFormProps {
  initialEmail?: string;
  onSuccess: (firstName: string) => void;
  goRegister: () => void;
  goForgot: () => void;
  setUser: (u: User) => void;
}

function LoginForm({ initialEmail = "", onSuccess, goRegister, goForgot, setUser }: LoginFormProps) {
  const [email, setEmail]               = useState(initialEmail);
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { user: me, access_token } = await login(email, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      setUser(me);
      onSuccess(me.first_name);
    } catch {
      setError("Email o contraseña incorrectos. Verificá tus datos.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Bienvenido de nuevo
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          ¿No tenés cuenta?{" "}
          <button
            type="button"
            onClick={goRegister}
            className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Registrate gratis
          </button>
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Contraseña</label>
            <button
              type="button"
              onClick={goForgot}
              className="text-xs text-brand-600 hover:text-brand-700 transition-colors"
              tabIndex={-1}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-200 hover:border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

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
          {!isLoading && "Ingresar"}
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
    </>
  );
}

// ─── Formulario de REGISTRO ──────────────────────────────────────────────────────

interface RegisterFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

const emptyForm: RegisterFormData = {
  first_name: "", last_name: "", email: "", password: "", confirm_password: "",
};

// Regex de email — mismo criterio que el backend
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reglas mínimas de contraseña — deben coincidir con validatePassword del backend
function isPasswordValid(pw: string): boolean {
  return pw.length >= 8 && pw.length <= 72 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: "", color: "", width: "0%" };
  if (password.length < 8)   return { label: "Muy corta", color: "bg-red-400", width: "25%" };
  // A partir de acá tiene longitud suficiente; medimos variedad de caracteres
  const hasLetter  = /[a-zA-Z]/.test(password);
  const hasNumber  = /[0-9]/.test(password);
  const hasSymbol  = /[^a-zA-Z0-9]/.test(password);
  if (!hasLetter || !hasNumber)
    return { label: "Falta letra y número", color: "bg-amber-400", width: "50%" };
  if (!hasSymbol)
    return { label: "Buena", color: "bg-blue-400", width: "75%" };
  return { label: "Fuerte", color: "bg-emerald-500", width: "100%" };
}

interface RegisterFormProps {
  onSuccess: (firstName: string, email: string) => void;
  goLogin: (email?: string) => void;
  setUser: (u: User) => void;
}

function RegisterForm({ onSuccess, goLogin, setUser }: RegisterFormProps) {
  const [form, setForm]               = useState<RegisterFormData>(emptyForm);
  const [errors, setErrors]           = useState<Partial<RegisterFormData>>({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const strength = getPasswordStrength(form.password);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<RegisterFormData> = {};
    if (!form.first_name.trim()) newErrors.first_name = "El nombre es requerido";
    if (!form.last_name.trim())  newErrors.last_name  = "El apellido es requerido";
    if (!form.email.trim())      newErrors.email      = "El email es requerido";
    else if (!EMAIL_REGEX.test(form.email.trim()))
      newErrors.email = "El email no tiene un formato válido";
    if (!form.password) newErrors.password = "La contraseña es requerida";
    else if (form.password.length < 8)
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    else if (form.password.length > 72)
      newErrors.password = "La contraseña no puede superar los 72 caracteres";
    else if (!isPasswordValid(form.password))
      newErrors.password = "Debe incluir al menos una letra y un número";
    if (form.password !== form.confirm_password)
      newErrors.confirm_password = "Las contraseñas no coinciden";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setIsLoading(true);
    try {
      const { user: me, access_token } = await register({
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
      });
      localStorage.setItem(TOKEN_KEY, access_token);
      setUser(me);
      onSuccess(me.first_name, me.email);
    } catch (err: unknown) {
      // El backend devuelve mensajes claros (email duplicado, política de
      // contraseña, etc.); los mostramos tal cual. Fallback genérico si no.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Ocurrió un error al crear la cuenta. Intentá de nuevo.";
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Creá tu cuenta
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          ¿Ya tenés cuenta?{" "}
          <button
            type="button"
            onClick={() => goLogin()}
            className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Iniciá sesión
          </button>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="Juan"
            error={errors.first_name}
            autoComplete="given-name"
            autoFocus
          />
          <Input
            label="Apellido"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Pérez"
            error={errors.last_name}
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="juan@email.com"
          error={errors.email}
          autoComplete="email"
        />

        {/* Contraseña con toggle + strength meter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                errors.password ? "border-red-400" : "border-slate-200 hover:border-slate-300"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.password.length > 0 && (
            <div className="space-y-1">
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transicion-ui duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <p className={`text-[11px] ${strength.color.replace("bg-", "text-")}`}>
                {strength.label}
              </p>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-red-600" role="alert">{errors.password}</p>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Confirmar contraseña</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              placeholder="Repetí tu contraseña"
              autoComplete="new-password"
              className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                errors.confirm_password
                  ? "border-red-400"
                  : form.confirm_password && form.password === form.confirm_password
                  ? "border-emerald-400"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {form.confirm_password && form.password === form.confirm_password && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-red-600" role="alert">{errors.confirm_password}</p>
          )}
        </div>

        {serverError && (
          <div className="flex flex-col gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {serverError}
            </div>
            {/* Si el email ya está registrado, ofrecer ir a login */}
            {serverError.toLowerCase().includes("ya existe") && (
              <button
                type="button"
                onClick={() => goLogin(form.email.trim().toLowerCase())}
                className="self-start ml-6 text-sm font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2"
              >
                Iniciar sesión con este email
              </button>
            )}
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
          {!isLoading && "Crear cuenta"}
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
    </>
  );
}

// ─── Formulario de RECUPERAR CONTRASEÑA ──────────────────────────────────────────

interface ForgotFormProps {
  initialEmail?: string;
  goLogin: () => void;
}

function ForgotForm({ initialEmail = "", goLogin }: ForgotFormProps) {
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
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">Revisá tu correo</h2>
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
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
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
