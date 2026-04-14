"use client";

// =============================================
// PÁGINA: REGISTRO DE USUARIO
// Formulario de creación de cuenta.
// Tras registrarse, muestra modal de bienvenida.
// =============================================

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { register } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useModalStore } from "@/stores/modalStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface RegisterFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

const emptyForm: RegisterFormData = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  confirm_password: "",
};

// Reglas de validación de contraseña (feedback visual en tiempo real)
function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: "", color: "", width: "0%" };
  if (password.length < 6)   return { label: "Débil",   color: "bg-red-400",   width: "25%" };
  if (password.length < 8)   return { label: "Regular", color: "bg-amber-400", width: "50%" };
  if (!/[^a-zA-Z0-9]/.test(password)) return { label: "Buena", color: "bg-blue-400", width: "75%" };
  return { label: "Fuerte", color: "bg-emerald-500", width: "100%" };
}

export default function RegisterPage() {
  const router    = useRouter();
  const setUser   = useAuthStore((state) => state.setUser);
  const openModal = useModalStore((s) => s.openModal);

  const [form, setForm]               = useState<RegisterFormData>(emptyForm);
  const [errors, setErrors]           = useState<Partial<RegisterFormData>>({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "El email no es válido";
    if (!form.password) newErrors.password = "La contraseña es requerida";
    else if (form.password.length < 8)
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
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
      localStorage.setItem("tele_import_token", access_token);
      setUser(me);
      // Redirigir al home y mostrar modal de registro exitoso
      router.push("/");
      openModal("register-success", {
        firstName: me.first_name,
        email:     me.email,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message.includes("email")
          ? "Ya existe una cuenta con ese email."
          : "Ocurrió un error al crear la cuenta. Intentá de nuevo.";
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Creá tu cuenta
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>

      {/* Card del formulario */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-7">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nombre y apellido */}
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
            <label className="text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                  errors.password
                    ? "border-red-400"
                    : "border-slate-200 hover:border-slate-300"
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
            {/* Barra de fortaleza */}
            {form.password.length > 0 && (
              <div className="space-y-1">
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
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
            <label className="text-sm font-medium text-slate-700">
              Confirmar contraseña
            </label>
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

          {/* Error del servidor */}
          {serverError && (
            <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {serverError}
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
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Al registrarte aceptás nuestros{" "}
        <Link href="#" className="underline hover:text-slate-600 transition-colors">
          términos y condiciones
        </Link>
      </p>
    </div>
  );
}
