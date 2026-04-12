"use client";

// =============================================
// PÁGINA: PERFIL DE USUARIO
// Permite al usuario ver y editar sus datos personales.
// =============================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { User } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, setUser } = useAuthStore();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [isLoading, setIsLoading]     = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError]             = useState("");

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user) {
      setForm({
        first_name: user.first_name ?? "",
        last_name:  user.last_name  ?? "",
        email:      user.email      ?? "",
        phone:      user.phone      ?? "",
      });
    }
  }, [isAuthenticated, user, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    const token = localStorage.getItem("tele_import_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
        }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      const data = await res.json() as { data: User };
      setUser(data.data);
      setSuccessMessage("Datos actualizados correctamente.");
    } catch {
      setError("No se pudieron guardar los cambios. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Encabezado de sección */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mi perfil</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Actualizá tus datos personales
        </p>
      </div>

      {/* Card de formulario */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
            />
            <Input
              label="Apellido"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            disabled
            helpText="El email no puede modificarse desde aquí"
          />

          {/* Feedback de operación */}
          {successMessage && (
            <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {successMessage}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" isLoading={isLoading}>
            Guardar cambios
          </Button>
        </form>
      </div>
    </div>
  );
}
