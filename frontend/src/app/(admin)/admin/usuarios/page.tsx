"use client";

// =============================================
// PÁGINA ADMIN: GESTIÓN DE USUARIOS
// Lista de usuarios con cambio de rol inline y eliminación.
// Requiere token JWT con rol admin para las acciones.
// Columnas de ancho fijo: al editar un rol, el selector ocupa el lugar del
// badge y Guardar/Cancelar el de Cambiar rol/Eliminar, sin mover la tabla.
// =============================================

import { useState, useEffect } from "react";
import { Users, AlertCircle, Loader2, ShieldCheck, UserCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { adminButton } from "@/components/admin/adminUi";
import { formatDate } from "@/lib/utils/format";
import { getAdminUsers, updateUserRole, deleteUser } from "@/lib/api/admin";
import { useAuthStore } from "@/stores/authStore";
import { useCanEdit } from "@/hooks/usePanelRole";
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
  admin: <ShieldCheck className="w-3 h-3" aria-hidden="true" />,
  customer: <UserCircle className="w-3 h-3" aria-hidden="true" />,
  readonly: <Eye className="w-3 h-3" aria-hidden="true" />,
};

// Mismo ancho para cada par de botones que se reemplazan entre sí
const PRIMARY_SLOT = "w-[6.5rem]";   // Cambiar rol ↔ Guardar
const SECONDARY_SLOT = "w-[5.75rem]"; // Eliminar ↔ Cancelar

const roleButtonId = (userId: string) => `cambiar-rol-${userId}`;

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canEdit = useCanEdit();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado para el cambio de rol inline: { [userId]: selectedRole }
  const [editingRole, setEditingRole] = useState<Record<string, UserRole>>({});
  const [savingRole, setSavingRole] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Al terminar de editar, el foco vuelve al botón "Cambiar rol" de esa fila
  const [returnFocusTo, setReturnFocusTo] = useState<string | null>(null);

  // -----------------------------------------------
  // Cargar usuarios al montar
  // -----------------------------------------------
  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!returnFocusTo) return;
    document.getElementById(roleButtonId(returnFocusTo))?.focus();
    setReturnFocusTo(null);
  }, [returnFocusTo]);

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
    setReturnFocusTo(userId);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Cargando..." : `${users.length} usuario${users.length !== 1 ? "s" : ""} registrado${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center" aria-hidden="true">
          <Users className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div role="alert" className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-brand-500 motion-safe:animate-spin" aria-hidden="true" />
            <span className="ml-2 text-sm text-slate-500">Cargando usuarios...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-sm">
              <colgroup>
                <col />
                <col />
                <col className="w-36" />
                <col className="w-36" />
                <col className={canEdit ? "w-[15rem]" : "w-0"} />
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Registrado
                  </th>
                  <th scope="col" className={canEdit ? "text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider" : "relative p-0"}>
                    <span className={canEdit ? undefined : "sr-only"}>Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isEditing = user.id in editingRole;
                  const isSaving = Boolean(savingRole[user.id]);
                  const isDeleting = deletingId === user.id;
                  const isCurrentUser = user.id === currentUser?.id;
                  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email;

                  return (
                    <tr
                      key={user.id}
                      className={`h-14 transition-colors motion-reduce:transition-none ${isEditing ? "bg-brand-50/40" : isCurrentUser ? "bg-blue-50/30" : "hover:bg-slate-50/60"}`}
                    >
                      {/* Avatar y nombre */}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                            <span className="text-[11px] font-bold text-slate-500">
                              {(user.first_name?.[0] ?? "?").toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate font-medium text-slate-800" title={fullName}>
                            {fullName}
                          </span>
                          {isCurrentUser && (
                            <span className="flex-shrink-0 text-[10px] bg-blue-100 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-semibold">
                              Vos
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-2 text-slate-500 text-xs">
                        <span className="block truncate" title={user.email}>{user.email}</span>
                      </td>

                      {/* Rol: el selector reemplaza al badge en el mismo lugar */}
                      <td className="px-4 py-2 text-center">
                        {isEditing ? (
                          <select
                            autoFocus
                            aria-label={`Rol de ${fullName}`}
                            value={editingRole[user.id]}
                            disabled={isSaving}
                            onChange={(e) =>
                              setEditingRole((prev) => ({
                                ...prev,
                                [user.id]: e.target.value as UserRole,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Escape") { e.preventDefault(); cancelEditRole(user.id); }
                              if (e.key === "Enter") { e.preventDefault(); void handleSaveRole(user.id); }
                            }}
                            className="h-8 w-full max-w-[9rem] rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60"
                          >
                            <option value="admin">Admin</option>
                            <option value="customer">Cliente</option>
                            <option value="readonly">Solo lectura</option>
                          </select>
                        ) : (
                          <Badge variant={ROLE_VARIANT[user.role]}>
                            <span className="flex items-center gap-1">
                              {ROLE_ICON[user.role]}
                              {ROLE_LABEL[user.role]}
                            </span>
                          </Badge>
                        )}
                      </td>

                      {/* Fecha de registro */}
                      <td className="px-4 py-2 text-slate-400 text-xs whitespace-nowrap">
                        {user.created_at ? formatDate(user.created_at) : "—"}
                      </td>

                      {/* Acciones: cada par de botones comparte el mismo ancho */}
                      <td className={canEdit ? "px-4 py-2" : "p-0"}>
                        {canEdit && (
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveRole(user.id)}
                                  disabled={isSaving}
                                  aria-busy={isSaving}
                                  className={adminButton("primary", "sm", PRIMARY_SLOT)}
                                >
                                  {isSaving && <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />}
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelEditRole(user.id)}
                                  disabled={isSaving}
                                  className={adminButton("secondary", "sm", SECONDARY_SLOT)}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  id={roleButtonId(user.id)}
                                  type="button"
                                  onClick={() => startEditRole(user.id, user.role)}
                                  disabled={isDeleting}
                                  aria-label={`Cambiar rol de ${fullName}`}
                                  className={adminButton("secondary", "sm", PRIMARY_SLOT)}
                                >
                                  Cambiar rol
                                </button>
                                {/* El usuario logueado no puede eliminarse: se deja el lugar vacío para alinear */}
                                {isCurrentUser ? (
                                  <span className={SECONDARY_SLOT} aria-hidden="true" />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(user)}
                                    disabled={isDeleting}
                                    aria-busy={isDeleting}
                                    aria-label={`Eliminar a ${fullName}`}
                                    className={adminButton("danger", "sm", SECONDARY_SLOT)}
                                  >
                                    {isDeleting && <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />}
                                    Eliminar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
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
