"use client";

// =============================================
// COMPONENTE: NOTIFICATION BELL
// Campana con badge de no leídas y dropdown
// de notificaciones internas del sistema.
// Solo visible para usuarios autenticados.
// =============================================

import { useRef, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Package, ShoppingBag, AlertTriangle, Star, CheckCheck } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Notification {
  id: string;
  type: "order_new" | "order_status" | "stock_low" | "review_new";
  title: string;
  message: string;
  is_read: number;
  link: string | null;
  created_at: string;
}

interface NotifResponse {
  data: Notification[];
  meta: { unread_count: number };
}

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("tele_import_token") : null;
}

const TYPE_ICON: Record<Notification["type"], React.ReactNode> = {
  order_new:    <ShoppingBag className="w-4 h-4 text-brand-500" />,
  order_status: <Package     className="w-4 h-4 text-emerald-500" />,
  stock_low:    <AlertTriangle className="w-4 h-4 text-amber-500" />,
  review_new:   <Star        className="w-4 h-4 text-purple-500" />,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Cerrar al hacer click fuera del dropdown
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Polling cada 30 s para detectar notificaciones nuevas
  const { data } = useQuery<NotifResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const token = getToken();
      if (!token) return { data: [], meta: { unread_count: 0 } };
      const res = await fetch(`${API_URL}/auth/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { data: [], meta: { unread_count: 0 } };
      return res.json() as Promise<NotifResponse>;
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const token = getToken();
      await fetch(`${API_URL}/auth/notifications/${id}/read`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const token = getToken();
      await fetch(`${API_URL}/auth/notifications/read-all`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function handleNotifClick(notif: Notification) {
    if (!notif.is_read) markRead.mutate(notif.id);
    setOpen(false);
  }

  const notifications  = data?.data ?? [];
  const unreadCount    = data?.meta.unread_count ?? 0;
  const displayedNotifs = notifications.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón campana */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` — ${unreadCount} sin leer` : ""}`}
        className={cn(
          "relative p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          open ? "bg-slate-100 text-slate-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        )}
      >
        <Bell className="w-5 h-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full
                           bg-red-500 text-white text-[9px] font-extrabold
                           flex items-center justify-center animate-pop-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl
                        border border-slate-200 shadow-lg shadow-slate-900/10 z-50 overflow-hidden">

          {/* Cabecera */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-[360px] overflow-y-auto">
            {displayedNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                <Bell className="w-7 h-7 opacity-30" />
                <p className="text-xs">No tenés notificaciones</p>
              </div>
            ) : (
              displayedNotifs.map((notif) => {
                const Wrapper = notif.link ? Link : "div";
                const wrapperProps = notif.link
                  ? { href: notif.link, onClick: () => handleNotifClick(notif) }
                  : { onClick: () => handleNotifClick(notif) };

                return (
                  // @ts-expect-error — href solo existe en Link, no en div
                  <Wrapper
                    key={notif.id}
                    {...wrapperProps}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
                      "hover:bg-slate-50 border-b border-slate-50 last:border-0",
                      !notif.is_read && "bg-brand-50/50"
                    )}
                  >
                    {/* Ícono según tipo */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                      {TYPE_ICON[notif.type] ?? <Bell className="w-4 h-4 text-slate-400" />}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn(
                          "text-xs leading-snug line-clamp-1",
                          !notif.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                        )}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-500 mt-1" aria-hidden />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatDateTime(notif.created_at)}
                      </p>
                    </div>
                  </Wrapper>
                );
              })
            )}
          </div>

          {/* Ver todas */}
          {notifications.length > 10 && (
            <div className="border-t border-slate-100 px-4 py-2.5 text-center">
              <span className="text-xs text-slate-400">
                Mostrando 10 de {notifications.length} notificaciones
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
