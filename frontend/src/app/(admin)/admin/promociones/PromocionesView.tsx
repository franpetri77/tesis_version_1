"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/utils/format";
import { listPromotions, savePromotion, setPromotionActive, type AdminPromotion, type PromotionInput } from "@/lib/api/promotions";

const inputClass = "mt-1 w-full rounded border border-paper-300 bg-paper-50 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60";
const secondary = "rounded border border-paper-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50";
const primary = "rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-60";
const micro = "text-xs font-semibold uppercase tracking-wider text-slate-500";
const types = {percentage:"Porcentaje",fixed_amount:"Monto fijo",free_shipping:"Envío gratis"};
type Draft = Omit<PromotionInput, "value" | "min_order_amount" | "max_uses" | "description" | "valid_until"> & {
  value:string; min_order_amount:string; max_uses:string; description:string; valid_until:string;
};
const blank = (): Draft => ({code:"",name:"",description:"",type:"percentage",value:"",min_order_amount:"",max_uses:"",is_active:true,valid_from:"",valid_until:""});
const day = (value: string) => value.split("-").reverse().join("/");

export function PromocionesView() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [editor, setEditor] = useState<{id:string|null; draft:Draft} | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const editingId = editor?.id;
  const editing = editor !== null;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    listPromotions(controller.signal).then(rows => {
      if (!controller.signal.aborted) setPromotions(rows);
    }).catch(e => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "No se pudieron cargar las promociones");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => { if (editing) titleRef.current?.focus(); }, [editingId, editing]);
  useEffect(() => {
    if (!editing && !busy && restoreFocus.current) {
      newRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [editing, busy]);

  function open(p?: AdminPromotion) {
    setActionError(null); setMessage("");
    setEditor({id:p?.id ?? null, draft:p ? {code:p.code,name:p.name,type:p.type,is_active:p.is_active,valid_from:p.valid_from,description:p.description ?? "",value:String(p.value),
      min_order_amount:p.min_order_amount === null ? "" : String(p.min_order_amount),
      max_uses:p.max_uses === null ? "" : String(p.max_uses),valid_until:p.valid_until ?? ""} : blank()});
  }
  function close() { restoreFocus.current = true; setEditor(null); setActionError(null); }
  function update<K extends keyof Draft>(key:K, value:Draft[K]) {
    setEditor(e => e ? {...e,draft:{...e.draft,[key]:value,...(key === "type" && value === "free_shipping" ? {value:"0"} : {})}} : e);
  }
  function replace(saved: AdminPromotion) {
    setPromotions(rows => [...rows.filter(p => p.id !== saved.id), saved].sort((a,b)=>a.code.localeCompare(b.code)));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor || busy) return;
    setBusy(true); setActionError(null);
    const d = editor.draft;
    try {
      const saved = await savePromotion(editor.id, {...d,value:Number(d.value),description:d.description.trim() || null,
        min_order_amount:d.min_order_amount === "" ? null : Number(d.min_order_amount),
        max_uses:d.max_uses === "" ? null : Number(d.max_uses),valid_until:d.valid_until || null});
      replace(saved); close(); setMessage(`Promoción ${saved.code} guardada.`);
    } catch(e) { setActionError(e instanceof Error ? e.message : "No se pudo guardar la promoción"); }
    finally { setBusy(false); }
  }
  async function toggle(p: AdminPromotion) {
    if (busy) return;
    setBusy(true); setActionError(null); setMessage("");
    try {
      const saved = await setPromotionActive(p.id,!p.is_active);
      replace(saved); setMessage(`${saved.code}: ${saved.is_active ? "activada" : "desactivada"}.`);
    } catch(e) { setActionError(e instanceof Error ? e.message : "No se pudo cambiar la promoción"); }
    finally { setBusy(false); }
  }
  const d = editor?.draft;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-paper-300 pb-4">
        <div><p className={micro}>Gestión comercial · Cupones</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Promociones</h1>
          <p className="mt-1 text-sm text-slate-500 tabular-nums">{loading ? "Cargando promociones…" : error ? "Consulta no disponible" : `${promotions.length} códigos · ${promotions.filter(p=>p.is_active).length} activos`}</p>
        </div>
        <button ref={newRef} type="button" disabled={loading || !!error || busy || !!editor} onClick={()=>open()} className={primary}>Nueva promoción</button>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-slate-600">{message}</p>
      {error && <div role="alert" className="space-y-2 text-sm text-slate-700"><p>{error}</p><button className={secondary} onClick={()=>setRetry(n=>n+1)}>Reintentar</button></div>}
      {actionError && <p role="alert" className="border-y border-paper-300 py-3 text-sm text-slate-700">{actionError}</p>}
      {editor && d && (
        <section aria-labelledby="editor-title" className="border-y border-paper-300 bg-paper-100 px-4 py-5 sm:px-6">
          <h2 id="editor-title" className="text-lg font-semibold tracking-tight text-slate-900">{editor.id ? "Editar promoción" : "Nueva promoción"}</h2>
          <p className="mt-1 max-w-prose text-sm text-slate-600">El código se aplica en el checkout. Los usos registrados se conservan al editar.</p>
          <form onSubmit={submit} className="mt-5">
            <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
              <label className={micro}>Código<input ref={titleRef} required maxLength={50} pattern="[A-Za-z0-9_-]+" value={d.code} onChange={e=>update("code",e.target.value)} className={`${inputClass} uppercase tracking-wider`} /></label>
              <label className={micro}>Nombre<input required maxLength={255} value={d.name} onChange={e=>update("name",e.target.value)} className={inputClass} /></label>
              <label className={micro}>Tipo<select value={d.type} onChange={e=>update("type",e.target.value as Draft["type"])} className={inputClass}>{Object.entries(types).map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>
              <label className={micro}>{d.type === "percentage" ? "Porcentaje" : d.type === "fixed_amount" ? "Descuento · ARS" : "Valor · Sin cargo"}<input type="number" required step="0.01" min={d.type === "free_shipping" ? 0 : 0.01} max={d.type === "percentage" ? 100 : 9999999999999.99} disabled={d.type === "free_shipping"} value={d.value} onChange={e=>update("value",e.target.value)} className={`${inputClass} tabular-nums`} /></label>
              <label className={micro}>Compra mínima · ARS (opcional)<input type="number" min="0" step="0.01" max="9999999999999.99" value={d.min_order_amount} onChange={e=>update("min_order_amount",e.target.value)} className={`${inputClass} tabular-nums`} /></label>
              <label className={micro}>Límite de usos (opcional)<input type="number" min="1" max="2147483647" step="1" value={d.max_uses} onChange={e=>update("max_uses",e.target.value)} className={`${inputClass} tabular-nums`} /></label>
              <label className={micro}>Vigente desde<input type="date" required min="1000-01-01" max="9999-12-31" value={d.valid_from} onChange={e=>update("valid_from",e.target.value)} className={`${inputClass} tabular-nums`} /></label>
              <label className={micro}>Vigente hasta (opcional)<input type="date" min={d.valid_from || "1000-01-01"} max="9999-12-31" value={d.valid_until} onChange={e=>update("valid_until",e.target.value)} className={`${inputClass} tabular-nums`} /></label>
              <label className={`${micro} md:col-span-2`}>Descripción (opcional)<textarea maxLength={5000} rows={2} value={d.description} onChange={e=>update("description",e.target.value)} className={inputClass} /></label>
              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2"><input type="checkbox" checked={d.is_active} onChange={e=>update("is_active",e.target.checked)} className="accent-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600" />Activa, sujeta a vigencia y usos disponibles</label>
            </fieldset>
            <div className="mt-5 flex flex-wrap gap-2"><button type="submit" disabled={busy} className={primary}>{busy ? "Guardando…" : "Guardar promoción"}</button><button type="button" disabled={busy} onClick={close} className={secondary}>Cancelar</button></div>
          </form>
        </section>
      )}
      {!error && <div className="overflow-x-auto border-y border-paper-300">
        <table className="w-full min-w-[850px] text-left text-sm tabular-nums">
          <thead className="border-b border-paper-300 bg-paper-100"><tr>{["Código · Nombre","Beneficio","Mínimo","Usos","Vigencia","Estado","Acciones"].map(h=><th key={h} scope="col" className={`px-4 py-3 ${micro}`}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-paper-200">
            {promotions.map(p=><tr key={p.id}>
              <th scope="row" className="px-4 py-4 font-normal"><span className="font-semibold tracking-wider text-slate-900">{p.code}</span><span className="mt-1 block text-xs text-slate-500">{p.name}</span></th>
              <td className="px-4 py-4 text-slate-900">{p.type === "percentage" ? `−${p.value}%` : p.type === "fixed_amount" ? `−${formatPrice(p.value)}` : "Envío gratis"}</td>
              <td className="px-4 py-4 text-slate-600">{p.min_order_amount === null ? "Sin mínimo" : formatPrice(p.min_order_amount)}</td>
              <td className="px-4 py-4 text-slate-600">{p.current_uses} / {p.max_uses ?? "Sin límite"}</td>
              <td className="px-4 py-4 text-xs text-slate-600">{day(p.valid_from)}<span className="mt-1 block">{p.valid_until ? `a ${day(p.valid_until)}` : "Sin vencimiento"}</span></td>
              <td className="px-4 py-4 text-xs text-slate-600">{p.is_active ? "Activa" : "Inactiva"}</td>
              <td className="px-4 py-4"><div className="flex gap-2"><button type="button" disabled={busy || !!editor} onClick={()=>open(p)} aria-label={`Editar ${p.code}`} className={secondary}>Editar</button><button type="button" disabled={busy || !!editor} onClick={()=>void toggle(p)} aria-label={`${p.is_active ? "Desactivar" : "Activar"} ${p.code}`} className={secondary}>{p.is_active ? "Desactivar" : "Activar"}</button></div></td>
            </tr>)}
            {!promotions.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">{loading ? "Cargando promociones…" : "No hay promociones creadas todavía"}</td></tr>}
          </tbody>
        </table>
      </div>}
    </div>
  );
}
