"use client";

// =============================================
// PÁGINA ADMIN: MENSAJES DE CLIENTES (T9)
// Bandeja compartida por el personal: lista de conversaciones (abiertas,
// resueltas o todas, con búsqueda) y la conversación elegida con los datos
// del cliente. ?c=<id> abre una conversación (enlace de la campana).
// El rol de solo lectura ve todo, pero no responde ni cambia el estado.
// =============================================

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MessagesSquare, CheckCircle2, RotateCcw, Mail, Phone, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice, formatDate } from "@/lib/utils/format";
import { Badge, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/components/ui/Badge";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatCustomerSkeleton, ChatInboxSkeleton } from "@/components/chat/ChatSkeletons";
import { LoadingState, Skeleton } from "@/components/ui/Skeleton";
import { useChatThread } from "@/hooks/useChatThread";
import { useCanEdit } from "@/hooks/usePanelRole";
import { staffChatApi, type ConversationStatus, type StaffThreadPage } from "@/lib/api/chat";
import type { OrderStatus } from "@/types";

const FILTERS: Array<{ value: ConversationStatus | "all"; label: string }> = [
  { value: "open", label: "Abiertas" },
  { value: "closed", label: "Resueltas" },
  { value: "all", label: "Todas" },
];

const shortTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(d);
};

function Conversation({ id, onStatusChange }: { id: string; onStatusChange: () => void }) {
  const canEdit = useCanEdit();
  const queryClient = useQueryClient();
  const [changing, setChanging] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const source = useMemo(() => ({
    key: `staff:${id}`,
    load: (p: { after?: number; before?: number }) => staffChatApi.thread(id, p),
    send: (body: string) => staffChatApi.send(id, body),
    read: (upTo: number) => staffChatApi.read(id, upTo),
    canMarkRead: canEdit,
  }), [id, canEdit]);
  const t = useChatThread<StaffThreadPage>(source, true);
  const customer = t.page?.customer ?? null;
  const status = t.conversation?.status;

  // La bandeja refleja enseguida lo leído y lo respondido
  const unread = t.conversation?.unread;
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["staff-chat"] });
  }, [unread, t.messages.length, queryClient]);

  async function toggleStatus() {
    if (!status) return;
    setChanging(true); setStatusError(null);
    try {
      await staffChatApi.setStatus(id, status === "open" ? "closed" : "open");
      await t.refresh();
      onStatusChange();
    } catch (e) {
      setStatusError((e as Error).message);
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Conversación">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            {t.loading && !customer ? (
              <div aria-hidden="true" className="space-y-2 py-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-44" />
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-semibold text-slate-900">{customer?.name ?? "Cliente"}</p>
                <p className="truncate text-xs text-slate-500">{customer?.email}</p>
              </>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {status && (
              <Badge variant={status === "open" ? "info" : "success"}>{status === "open" ? "Abierta" : "Resuelta"}</Badge>
            )}
            {canEdit && status && (
              <button
                type="button"
                onClick={toggleStatus}
                disabled={changing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {status === "open"
                  ? <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Marcar resuelta</>
                  : <><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reabrir</>}
              </button>
            )}
          </div>
        </header>
        {statusError && <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{statusError}</p>}
        <ChatThread
          viewer="staff"
          className="flex-1"
          messages={t.messages}
          conversation={t.conversation}
          loading={t.loading}
          error={t.error}
          hasMore={t.hasMore}
          onLoadOlder={t.loadOlder}
          onSend={(body) => t.send(body)}
          onRetry={t.initFailed ? () => void t.retry() : undefined}
          sending={t.sending}
          sendError={t.sendError}
          canWrite={canEdit}
          readOnlyNote="Tu usuario es de solo lectura: podés ver las conversaciones, pero no responder."
          placeholder={status === "closed" ? "Responder reabre la conversación" : "Escribí tu respuesta"}
          autoFocus
        />
      </section>

      {t.loading && !customer && !t.error && <ChatCustomerSkeleton />}
      {customer && (
        <aside className="flex-shrink-0 border-t border-slate-200 px-4 py-4 text-sm lg:w-64 lg:overflow-y-auto lg:border-l lg:border-t-0" aria-label="Datos del cliente">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cliente</h2>
          <p className="mt-2 font-semibold text-slate-900">{customer.name}</p>
          <p className="mt-1 flex items-center gap-1.5 break-all text-xs text-slate-600"><Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden />{customer.email}</p>
          {customer.phone && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600"><Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden />{customer.phone}</p>}
          {customer.created_at && <p className="mt-1 text-xs text-slate-400">Cliente desde {formatDate(customer.created_at)}</p>}
          <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Últimos pedidos</h2>
          {customer.recent_orders.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">Todavía no hizo pedidos.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {customer.recent_orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="block rounded-lg border border-slate-200 px-2.5 py-2 hover:bg-slate-50">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800">{o.order_number}</span>
                      <span className="text-xs text-slate-600">{formatPrice(o.total)}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <Badge variant={ORDER_STATUS_VARIANT[o.status as OrderStatus] ?? "default"} className="text-[10px]">
                        {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                      </Badge>
                      {o.created_at && <span className="text-[10px] text-slate-400">{formatDate(o.created_at)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}

function Inbox() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("c");
  const [filter, setFilter] = useState<ConversationStatus | "all">("open");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const list = useQuery({
    queryKey: ["staff-chat", "list", filter, q],
    queryFn: () => staffChatApi.list(filter, q || undefined),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
  const conversations = list.data ?? [];

  const select = (id: string | null) => router.replace(id ? `/admin/mensajes?c=${encodeURIComponent(id)}` : "/admin/mensajes", { scroll: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mensajes</h1>
        <p className="mt-0.5 text-sm text-slate-500">Consultas de los clientes desde la tienda. Se actualiza solo.</p>
      </div>

      <div className="flex h-[calc(100vh-12rem)] min-h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {/* Lista */}
        <div className={cn("flex w-full flex-shrink-0 flex-col border-r border-slate-200 md:w-80", selected && "hidden md:flex")}>
          <div className="space-y-2 border-b border-slate-200 p-3">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5" role="tablist" aria-label="Filtrar conversaciones">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold",
                    filter === f.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className="relative block">
              <span className="sr-only">Buscar por nombre o correo</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o correo"
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-xs focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </label>
          </div>
          <ul className="flex-1 overflow-y-auto" aria-label="Conversaciones">
            {list.isLoading && <li><ChatInboxSkeleton /></li>}
            {list.isError && <li className="px-4 py-6 text-center text-xs text-red-600">{(list.error as Error).message}</li>}
            {!list.isLoading && !list.isError && conversations.length === 0 && (
              <li className="px-4 py-10 text-center text-xs text-slate-400">
                {q ? "No hay conversaciones que coincidan." : filter === "open" ? "No hay conversaciones abiertas." : "No hay conversaciones."}
              </li>
            )}
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => select(c.id)}
                  aria-current={selected === c.id ? "true" : undefined}
                  className={cn(
                    "block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50",
                    selected === c.id && "bg-brand-50 hover:bg-brand-50"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-sm", c.unread > 0 ? "font-bold text-slate-900" : "font-medium text-slate-800")}>
                      {c.customer.name || c.customer.email}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-slate-400">{shortTime(c.last_message_at)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={cn("truncate text-xs", c.unread > 0 ? "text-slate-700" : "text-slate-500")}>
                      {c.last_message ? `${c.last_message.sender_role === "staff" ? "Tele Import: " : ""}${c.last_message.body}` : ""}
                    </span>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white" aria-label={`${c.unread} sin leer`}>
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </span>
                  {filter === "all" && c.status === "closed" && <span className="mt-1 block text-[10px] font-medium text-emerald-600">Resuelta</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Conversación */}
        <div className={cn("min-w-0 flex-1 flex-col", selected ? "flex" : "hidden md:flex")}>
          {selected ? (
            <>
              <button type="button" onClick={() => select(null)} className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2 text-xs font-semibold text-brand-600 md:hidden">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Conversaciones
              </button>
              <Conversation key={selected} id={selected} onStatusChange={() => void list.refetch()} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-400">
              <MessagesSquare className="mb-3 h-8 w-8" strokeWidth={1.5} aria-hidden />
              <p className="text-sm">Elegí una conversación para leerla y responder.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminMensajesPage() {
  return (
    <Suspense fallback={
      <LoadingState label="Cargando la bandeja de mensajes…" className="space-y-5">
        <Skeleton className="mb-5 h-7 w-36" />
        <Skeleton className="h-[28rem] w-full rounded-xl" />
      </LoadingState>
    }>
      <Inbox />
    </Suspense>
  );
}
