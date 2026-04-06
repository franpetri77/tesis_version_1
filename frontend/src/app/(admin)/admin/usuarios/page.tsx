"use client";

// =============================================
// PÁGINA ADMIN: GESTIÓN DE USUARIOS
// Lista de usuarios con cambio de rol inline y eliminación.
// Requiere token JWT con rol admin para las acciones.
// =============================================

import { useState, useEffect } from "react";
import { Users, AlertCircle, Loader2, ShieldCheck, UserCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/format";
import { getAdminUsers, updateUserRole, deleteUser } from "@/lib/api/admin";
import { useAuthStore } from "@/stores/authStore";
import type { User, UserRole } from "@/types";

// -----------------------------------------------
// Mapeo de rol a variante de badge y etiqueta visual
// -----------------------------------------------
const ROLE_VARIANT: Record<UserRole, "danger" | "success" | "default"> = {
  admin: "danger",
  customer: "success",
  readonly: "default",
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  customer: "Cliente",
  readonly: "Solo lectura",
};

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck className="w-3 h-3" />,
  customer: <UserCircle className="w-3 h-3" />,
  readonly: <Eye className="w-3 h-3" />,
};

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado para el cambio de rol inline: { [userId]: selectedRole }
  const [editingRole, setEditingRole] = useState<Record<string, UserRole>>({});
  const [savingRole, setSavingRole] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // -----------------------------------------------
  // Cargar usuarios al montar
  // -----------------------------------------------
  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------
  // Iniciar edición del rol de un usuario
  // -----------------------------------------------
  function startEditRole(userId: string, currentRole: UserRole) {
    setEditingRole((prev) => ({ ...prev, [userId]: currentRole }));
  }

  function cancelEditRole(userId: string) {
    setEditingRole((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  }

  // -----------------------------------------------
  // Guardar el nuevo rol de un usuario
  // -----------------------------------------------
  async function handleSaveRole(userId: string) {
    const newRole = editingRole[userId];
    if (!newRole) return;

    setSavingRole((prev) => ({ ...prev, [userId]: true }));
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      );
      cancelEditRole(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el rol");
    } finally {
      setSavingRole((prev) => ({ ...prev, [userId]: false }));
    }
  }

  // -----------------------------------------------
  // Eliminar un usuario
  // -----------------------------------------------
  async function handleDelete(user: User) {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar al usuario "${user.first_name} ${user.last_name}" (${user.email})?\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setError("");
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el usuario");
    } finally {
      setDeletingId(null);
    }
  }

  // -----------------------------------------------
  // Render
  // -----------------------------------------------
  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Cargando..." : `${users.length} usuario${users.length !== 1 ? "s" : ""} registrado${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Users className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            <span className="ml-2 text-sm text-slate-500">Cargando usuarios...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Registrado
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isEditing = user.id in editingRole;
                  const isSaving = Boolean(savingRole[user.id]);
                  const isDeleting = deletingId === user.id;
                  const isCurrentUser = user.id === currentUser?.id;

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/60 transition-colors ${isCurrentUser ? "bg-blue-50/30" : ""}`}
                    >
                      {/* Avatar y nombre */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-slate-500">
                              {(user.first_name?.[0] ?? "?").toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-800">
                              {user.first_name} {user.last_name}
                            </span>
                            {isCurrentUser && (
                              <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-semibold">
                                Vos
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {user.email}
                      </td>

                      {/* Rol (con edición inline) */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2 justify-center">
                            <select
                              value={editingRole[user.id]}
                              onChange={(e) =>
                                setEditingRole((prev) => ({
                                  ...prev,
                                  [user.id]: e.target.value as UserRole,
                                }))
                              }
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                            >
                              <option value="admin">Admin</option>
                              <option value="customer">Cliente</option>
                              <option value="readonly">Solo lectura</option>
                            </select>
                            <button
                              onClick={() => handleSaveRole(user.id)}
                              disabled={isSaving}
                              className="text-xs text-emerald-700 font-semibold hover:text-emerald-800 disabled:opacity-50 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg transition-colors"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Guardar"
                              )}
                            </button>
                            <button
                              onClick={() => cancelEditRole(user.id)}
                              disabled={isSaving}
                              className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge variant={ROLE_VARIANT[user.role]}>
                              <span className="flex items-center gap-1">
                                {ROLE_ICON[user.role]}
                                {ROLE_LABEL[user.role]}
                              </span>
                            </Badge>
                          </div>
                        )}
                      </td>

                      {/* Fecha de registro */}
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {user.created_at ? formatDate(user.created_at) : "—"}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* Cambiar rol */}
                          {!isEditing && (
                            <button
                              onClick={() => startEditRole(user.id, user.role)}
                              className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                            >
                              Cambiar rol
                            </button>
                          )}

                          {/* Eliminar (no mostrar para el usuario logueado) */}
                          {!isCurrentUser && (
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={isDeleting}
                              className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                "Eliminar"
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center text-slate-400 text-sm">
                      No hay usuarios registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
