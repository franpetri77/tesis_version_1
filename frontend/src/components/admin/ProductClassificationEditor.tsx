"use client";

import { useEffect, useRef } from "react";
import { adminButton } from "@/components/admin/adminUi";
export type MetadataRows = Array<[string, string | number | boolean]>;
const input = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";
const label = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";
export function ProductClassificationEditor({tags,metadata,onTags,onMetadata}: {
  tags:string; metadata:MetadataRows; onTags:(v:string)=>void; onMetadata:(v:MetadataRows)=>void;
}) {
  const names = useRef<Array<HTMLInputElement|null>>([]);
  const duplicates = metadata.map(([key],i)=>metadata.some(([other],j)=>j!==i && other.trim()===key.trim()));
  useEffect(()=>{
    metadata.forEach((_,i)=>names.current[i]?.setCustomValidity(duplicates[i] ? "El nombre de la especificación está repetido" : ""));
  },[metadata,duplicates]);
  function change(index:number,key:string,value:string|number|boolean) {
    onMetadata(metadata.map((row,i) => i===index ? [key,value] : row));
  }
  return <section className="space-y-4 bg-white rounded-xl border border-slate-200 p-5">
    <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">Etiquetas y especificaciones</h2>
    <div><label htmlFor="product-tags" className={label}>Etiquetas</label>
      <input id="product-tags" value={tags} onChange={e=>onTags(e.target.value)} className={input} placeholder="USB-C, Inalámbrico" aria-describedby="tags-help" />
    </div>
    <p id="tags-help" className="text-xs text-slate-500">Separalas con comas. Hasta 20 etiquetas; aparecen como filtros del catálogo.</p>
    <p className={label}>Especificaciones técnicas</p>
    {metadata.map(([key,value],i)=><div key={i}>
      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
        <input ref={e=>{names.current[i]=e;}} aria-label={`Nombre de especificación ${i+1}`} aria-invalid={duplicates[i]} value={key} maxLength={80} required onChange={e=>change(i,e.target.value,value)} className={input}/>
        {typeof value === "boolean"
          ? <select aria-label={`Valor de especificación ${i+1}`} value={value ? "true" : "false"} onChange={e=>change(i,key,e.target.value==="true")} className={input}><option value="true">Sí</option><option value="false">No</option></select>
          : <input aria-label={`Valor de especificación ${i+1}`} value={String(value)} maxLength={500} required onChange={e=>change(i,key,e.target.value)} className={input}/>}
        <button type="button" aria-label={`Quitar especificación ${i+1}`} onClick={()=>onMetadata(metadata.filter((_,j)=>j!==i))} className={adminButton("ghost", "sm")}>Quitar</button>
      </div>
      {duplicates[i] && <p role="alert" className="mt-1 text-xs text-red-600">El nombre de la especificación está repetido.</p>}
    </div>)}
    {metadata.length<30 && <button type="button" onClick={()=>{let n=metadata.length+1;while(metadata.some(([key])=>key.trim()===`Atributo ${n}`))n++;onMetadata([...metadata,[`Atributo ${n}`,""]]);}} className={adminButton("secondary", "sm")}>Agregar especificación</button>}
  </section>;
}
