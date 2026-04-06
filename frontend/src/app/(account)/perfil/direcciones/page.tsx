"use client";

// =============================================
// PÁGINA: GESTIÓN DE DIRECCIONES
// Permite al usuario ver, agregar, editar,
// eliminar y establecer una dirección predeterminada.
// =============================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AddressCardSkeleton } from "@/components/ui/Skeleton";
import {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/api/account";
import type { Address } from "@/types";

// -----------------------------------------------
// Provincias de Argentina para el select
// -----------------------------------------------
const ARGENTINIAN_PROVINCES = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

// -----------------------------------------------
// Estado inicial del formulario de dirección
// -----------------------------------------------
const EMPTY_FORM = {
  street:      "",
  number:      "",
  floor:       "",
  apartment:   "",
  city:        "",
  province:    "",
  postal_code: "",
  country:     "Argentina",
  is_default:  false,
};

type AddressForm = typeof EMPTY_FORM;

export default function AddressesPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  // Estado local de UI
  const [showForm, setShowForm]           = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [form, setForm]                   = useState<AddressForm>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage]   = useState("");
  const [errorMessage, setErrorMessage]       = useState("");

  // Redirigir si no hay sesión activa
  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  // Limpiar mensajes de feedback automáticamente
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Obtener lista de direcciones del backend
  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["my-addresses", user?.id],
    queryFn:  getMyAddresses,
    enabled:  Boolean(user?.id),
  });

  // Mutación: crear o editar dirección
  const saveMutation = useMutation({
    mutationFn: (data: AddressForm) => {
      const payload = {
        ...data,
        floor:      data.floor.trim()      || undefined,
        apartment:  data.apartment.trim()  || undefined,
      } as Omit<Address, "id" | "user_id">;

      return editingId
        ? updateAddress(editingId, payload)
        : createAddress(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      closeForm();
      setSuccessMessage(editingId ? "Dirección actualizada." : "Dirección agregada.");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message ?? "Error al guardar la dirección.");
    },
  });

  // Mutación: eliminar dirección
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      setDeleteConfirmId(null);
      setSuccessMessage("Dirección eliminada.");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message ?? "Error al eliminar la dirección.");
    },
  });

  // Mutación: marcar como predeterminada
  const defaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultAddress(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      setSuccessMessage("Dirección predeterminada actualizada.");
    },
    onError: (err: Error) => {
      setErrorMessage(err.message ?? "Error al actualizar dirección predeterminada.");
    },
  });

  // Abrir formulario de edición con datos existentes
  function handleEdit(address: Address) {
    setEditingId(address.id);
    setForm({
      street:      address.street,
      number:      address.number,
      floor:       address.floor ?? "",
      apartment:   address.apartment ?? "",
      city:        address.city,
      province:    address.province,
      postal_code: address.postal_code,
      country:     address.country,
      is_default:  Boolean(address.is_default),
    });
    setShowForm(true);
    setErrorMessage("");
  }

  // Abrir formulario de nueva dirección
  function handleNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setErrorMessage("");
  }

  // Cerrar y resetear formulario
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    saveMutation.mutate(form);
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Direcciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestioná tus domicilios de entrega
          </p>
        </div>
        {!showForm && (
          <Button variant="primary" size="sm" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </Button>
        )}
      </div>

      {/* Feedback global */}
      {successMessage && (
        <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* ---- FORMULARIO DE NUEVA / EDICIÓN ---- */}
      {showForm && (
        <div className="bg-white rounded-xl border border-brand-200 shadow-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">
              {editingId ? "Editar dirección" : "Nueva dirección"}
            </h2>
            <button
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Cerrar formulario"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Calle y número */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Calle"
                  name="street"
                  value={form.street}
                  onChange={handleChange}
                  required
                  placeholder="Av. Corrientes"
                />
              </div>
              <Input
                label="Número"
                name="number"
                value={form.number}
                onChange={handleChange}
                required
                placeholder="1234"
              />
            </div>

            {/* Piso y departamento (opcionales) */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Piso"
                name="floor"
                value={form.floor}
                onChange={handleChange}
                placeholder="3 (opcional)"
              />
              <Input
                label="Departamento"
                name="apartment"
                value={form.apartment}
                onChange={handleChange}
                placeholder="B (opcional)"
              />
            </div>

            {/* Ciudad y código postal */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ciudad"
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                placeholder="Buenos Aires"
              />
              <Input
                label="Código postal"
                name="postal_code"
                value={form.postal_code}
                onChange={handleChange}
                required
                placeholder="1000"
              />
            </div>

            {/* Provincia */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Provincia <span className="text-red-500">*</span>
              </label>
              <select
                name="province"
                value={form.province}
                onChange={handleChange}
                required
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              >
                <option value="" disabled>Seleccioná una provincia</option>
                {ARGENTINIAN_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            {/* Checkbox dirección predeterminada */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                name="is_default"
                checked={form.is_default}
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <span className="text-sm text-slate-700">Usar como dirección predeterminada</span>
            </label>

            {/* Error del formulario */}
            {errorMessage && (
              <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errorMessage}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={saveMutation.isPending}
              >
                {editingId ? "Guardar cambios" : "Agregar dirección"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ---- LISTA DE DIRECCIONES ---- */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map((i) => <AddressCardSkeleton key={i} />)}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        // Estado vacío
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <MapPin className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="text-slate-700 font-semibold mb-1">Sin direcciones guardadas</p>
          <p className="text-slate-400 text-sm mb-5">
            Agregá tu primer domicilio para agilizar el checkout.
          </p>
          <Button variant="primary" size="sm" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5" />
            Agregar dirección
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addresses.map((address) => {
            const isDefault     = Boolean(address.is_default);
            const isDeleting    = deleteConfirmId === address.id;
            const isSettingDefault = defaultMutation.isPending;

            return (
              <div
                key={address.id}
                className={`bg-white rounded-xl border shadow-card p-4 transition-all ${
                  isDefault ? "border-brand-300" : "border-slate-200"
                }`}
              >
                {/* Badge predeterminada */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {address.street} {address.number}
                      {address.floor && `, Piso ${address.floor}`}
                      {address.apartment && ` Dpto ${address.apartment}`}
                    </span>
                  </div>
                  {isDefault && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full flex-shrink-0">
                      <Star className="w-2.5 h-2.5 fill-brand-500 text-brand-500" />
                      Predeterminada
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 pl-5.5 pl-[22px]">
                  {address.city}, {address.province} · CP {address.postal_code}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 pl-[22px]">{address.country}</p>

                {/* Acciones */}
                {isDeleting ? (
                  // Confirmación de eliminación
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-600 mb-2">¿Eliminar esta dirección?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(address.id)}
                      >
                        Sí, eliminar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {/* Marcar como predeterminada */}
                    {!isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isSettingDefault}
                        onClick={() => defaultMutation.mutate(address.id)}
                      >
                        <Star className="w-3.5 h-3.5" />
                        Predeterminar
                      </Button>
                    )}
                    {/* Editar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(address)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                    {/* Eliminar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirmId(address.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
