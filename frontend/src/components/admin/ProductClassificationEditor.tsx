"use client";

const input = "w-full rounded border border-paper-300 bg-paper-50 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600";
export function ProductClassificationEditor({tags,metadata,onTags,onMetadata}: {
  tags:string; metadata:Record<string,string|number|boolean>; onTags:(v:string)=>void; onMetadata:(v:Record<string,string|number|boolean>)=>void;
}) {
  const entries = Object.entries(metadata);
  function change(index:number,key:string,value:string|number|boolean) {
    const rows = entries.map((row,i) => i===index ? [key,value] : row);
    onMetadata(Object.fromEntries(rows));
  }
  return <section className="space-y-4 rounded border border-paper-300 bg-paper-50 p-5">
    <h2 className="text-sm font-semibold text-slate-900">Etiquetas y especificaciones</h2>
    <label className="block text-sm text-slate-700">Etiquetas
      <input value={tags} onChange={e=>onTags(e.target.value)} className={input} placeholder="USB-C, Inalámbrico" aria-describedby="tags-help" />
    </label>
    <p id="tags-help" className="text-xs text-slate-500">Separalas con comas. Hasta 20 etiquetas; aparecen como filtros del catálogo.</p>
    <p className="text-sm text-slate-700">Especificaciones técnicas</p>
    {entries.map(([key,value],i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
      <input aria-label={`Nombre de especificación ${i+1}`} value={key} maxLength={80} required onChange={e=>{const key=e.target.value;const duplicate=entries.some(([k],j)=>j!==i && k===key);e.target.setCustomValidity(duplicate ? "El nombre de la especificación está repetido" : "");if(!duplicate)change(i,key,value);}} className={input}/>
      <input aria-label={`Valor de especificación ${i+1}`} value={String(value)} maxLength={500} required onChange={e=>change(i,key,e.target.value)} className={input}/>
      <button type="button" aria-label={`Quitar especificación ${i+1}`} onClick={()=>onMetadata(Object.fromEntries(entries.filter((_,j)=>j!==i)))} className="px-2 py-2 text-sm text-slate-700 hover:bg-paper-200 focus-visible:ring-2 focus-visible:ring-brand-600">Quitar</button>
    </div>)}
    {entries.length<30 && <button type="button" onClick={()=>{let n=entries.length+1;while(Object.hasOwn(metadata,`Atributo ${n}`))n++;onMetadata({...metadata,[`Atributo ${n}`]:""});}} className="rounded border border-paper-300 px-3 py-2 text-sm text-slate-700 hover:bg-paper-100 focus-visible:ring-2 focus-visible:ring-brand-600">Agregar especificación</button>}
  </section>;
}
