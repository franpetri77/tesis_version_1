"use client";

// =============================================
// FORMULARIOS DE AUTENTICACIÓN COMPARTIDOS
// Login y registro con su validación y llamada a la API.
// Los usan las páginas /login y /registro y el modal de
// autenticación; cada contenedor pone su propio encabezado
// y decide qué hacer al terminar (onSuccess).
// =============================================

import { useId, useState } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { login, register } from "@/lib/api/auth";
import { passwordTooLong } from "@/lib/utils/password";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { User } from "@/types";

const TOKEN_KEY = "tele_import_token";

// Regex de email — mismo criterio que el backend
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Campo de contraseña con botón de mostrar/ocultar ───────────────────────────

interface PasswordFieldProps {
  label: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete: string;
  error?: string;
  /** Borde verde cuando el valor es correcto (p. ej. confirmación) */
  valid?: boolean;
  /** Elemento a la derecha del label (p. ej. "¿Olvidaste tu contraseña?") */
  labelAside?: React.ReactNode;
  children?: React.ReactNode;
}

function PasswordField({
  label, name, value, onChange, placeholder, autoComplete,
  error, valid, labelAside, children,
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-lg border px-3.5 py-2.5 pr-16 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
            error
              ? "border-red-400"
              : valid
              ? "border-emerald-400"
              : "border-slate-200 hover:border-slate-300"
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {valid && <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {children}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}

function SubmitButton({ isLoading, children }: { isLoading: boolean; children: string }) {
  return (
    <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading} className="mt-1 gap-2">
      {!isLoading && children}
      {!isLoading && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
    </Button>
  );
}

// ─── LOGIN ──────────────────────────────────────────────────────────────────────

interface LoginFormProps {
  initialEmail?: string;
  /** Se llama con el usuario ya guardado en el store y el token en localStorage */
  onSuccess: (user: User) => void;
  /** Acción "¿Olvidaste tu contraseña?" (botón o enlace) */
  forgotAction?: React.ReactNode;
}

export function LoginForm({ initialEmail = "", onSuccess, forgotAction }: LoginFormProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail]         = useState(initialEmail);
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { user: me, access_token } = await login(email, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      setUser(me);
      onSuccess(me);
    } catch {
      setError("Email o contraseña incorrectos. Verificá tus datos.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
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

      <PasswordField
        label="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        labelAside={forgotAction}
      />

      {error && (
        <FormError>
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        </FormError>
      )}

      <SubmitButton isLoading={isLoading}>Ingresar</SubmitButton>
    </form>
  );
}

// ─── REGISTRO ───────────────────────────────────────────────────────────────────

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

// Reglas mínimas de contraseña — deben coincidir con validatePassword del backend
function isPasswordValid(pw: string): boolean {
  return pw.length >= 8 && pw.length <= 72 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: "", color: "", width: "0%" };
  if (password.length < 8)   return { label: "Muy corta", color: "bg-red-400", width: "25%" };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  if (!hasLetter || !hasNumber)
    return { label: "Falta letra y número", color: "bg-amber-400", width: "50%" };
  if (!hasSymbol)
    return { label: "Buena", color: "bg-brand-400", width: "75%" };
  return { label: "Fuerte", color: "bg-emerald-500", width: "100%" };
}

interface RegisterFormProps {
  /** Se llama con el usuario ya guardado en el store y el token en localStorage */
  onSuccess: (user: User) => void;
  /** Si el email ya está registrado, ofrece ir a ingresar con ese email */
  onEmailTaken?: (email: string) => void;
}

export function RegisterForm({ onSuccess, onEmailTaken }: RegisterFormProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm]               = useState<RegisterFormData>(emptyForm);
  const [errors, setErrors]           = useState<Partial<RegisterFormData>>({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading]     = useState(false);

  const strength = getPasswordStrength(form.password);
  const confirmOk = Boolean(form.confirm_password) && form.password === form.confirm_password;

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
    else if (passwordTooLong(form.password))
      newErrors.password = "La contraseña es demasiado larga: admite hasta 72 caracteres, y cada tilde, ñ o emoji cuenta como más de uno";
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
      onSuccess(me);
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

      <PasswordField
        label="Contraseña"
        name="password"
        value={form.password}
        onChange={handleChange}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        error={errors.password}
      >
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
      </PasswordField>

      <PasswordField
        label="Confirmar contraseña"
        name="confirm_password"
        value={form.confirm_password}
        onChange={handleChange}
        placeholder="Repetí tu contraseña"
        autoComplete="new-password"
        error={errors.confirm_password}
        valid={confirmOk}
      />

      {serverError && (
        <FormError>
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            {serverError}
          </div>
          {onEmailTaken && serverError.toLowerCase().includes("ya existe") && (
            <button
              type="button"
              onClick={() => onEmailTaken(form.email.trim().toLowerCase())}
              className="self-start ml-6 text-sm font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2"
            >
              Iniciar sesión con este email
            </button>
          )}
        </FormError>
      )}

      <SubmitButton isLoading={isLoading}>Crear cuenta</SubmitButton>
    </form>
  );
}
