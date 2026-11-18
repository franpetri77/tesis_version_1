// Run after npm run build. In-memory adapter, no external DB or payment calls.
const {test,before,after,beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
let rows,audit,tail=Promise.resolve(),failAudit=false,connections,calls;
const normalize = s=>s.replace(/\s+/g,' ').trim();
function query(raw,args=[]) {
  const sql=normalize(raw);
  // T7 c1: rol vigente que lee el middleware del panel (el id del token lo codifica: u-<rol>)
  if(sql.includes("AS panel_role")) return [[{panel_role:args[0].slice(2)}],[]];
  calls.push(sql);
  if(sql.startsWith('SELECT * FROM promotions WHERE id')) return [[structuredClone(rows.get(args[0]))].filter(Boolean),[]];
  if(sql.startsWith('SELECT * FROM promotions ORDER BY')) return [[...rows.values()].sort((a,b)=>a.code.localeCompare(b.code)),[]];
  if(sql.startsWith('INSERT INTO audit_logs')) { if(failAudit) throw Error('audit failure'); audit.push(args); return [{affectedRows:1},[]]; }
  if(sql.startsWith('UPDATE promotions SET is_active')) { rows.get(args[1]).is_active=Number(args[0]); return [{affectedRows:1},[]]; }
  if(sql.startsWith('INSERT INTO promotions') || sql.startsWith('UPDATE promotions SET code')) {
    const [code,name,description,type,value,min_order_amount,max_uses,is_active,valid_from,valid_until,id]=args;
    if([...rows.values()].some(p=>p.id!==id && p.code.toUpperCase()===code.toUpperCase())) throw Object.assign(Error('duplicate'),{code:'ER_DUP_ENTRY'});
    rows.set(id,{id,code,name,description,type,value,min_order_amount,max_uses,is_active:Number(is_active),valid_from,valid_until,current_uses:rows.get(id)?.current_uses ?? 0});
    return [{affectedRows:1},[]];
  }
  throw Error('Unexpected SQL: '+sql);
}
const pool = {query:async(s,a)=>query(s,a),getConnection:async()=>{
  connections++; let unlock,snapshot;
  return {async beginTransaction(){const prev=tail;tail=new Promise(r=>unlock=r);await prev;snapshot={rows:structuredClone(rows),audit:structuredClone(audit)};},
    query:async(s,a)=>query(s,a),async commit(){snapshot=null;unlock();unlock=null;},
    async rollback(){if(snapshot){rows=snapshot.rows;audit=snapshot.audit;}snapshot=null;unlock?.();unlock=null;},
    release(){assert.equal(unlock,null);}};
}};
require.cache[require.resolve('../dist/db/database')]={exports:{__esModule:true,default:pool}};
process.env.JWT_SECRET='promotions-local-tests';
const {adminRouter}=require('../dist/routes/admin');
const {promotionInput}=require('../dist/services/promotions');
let server,base;
const token=role=>jwt.sign({userId:'u-'+role,role},process.env.JWT_SECRET);
const input=(extra={})=>({code:' dto_10 ',name:'Descuento',description:null,type:'percentage',value:10,min_order_amount:null,max_uses:null,is_active:true,valid_from:'2026-11-18',valid_until:null,...extra});
before(()=>new Promise(r=>{const app=express();app.use(express.json());app.use('/admin',adminRouter);server=app.listen(0,'127.0.0.1',()=>{base='http://127.0.0.1:'+server.address().port;r();});}));
after(()=>new Promise(r=>server.close(r)));
beforeEach(()=>{rows=new Map();audit=[];failAudit=false;connections=0;calls=[];});
async function request(method,path='',body,role='admin'){
  const res=await fetch(base+'/admin/promotions'+path,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+token(role)}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:res.status,body:await res.json()};
}
test('readonly reads promotions; writes stay forbidden, customer denied and missing token rejected',async()=>{
  for(const role of [null,'customer','readonly']) for(const [method,path,body] of [['GET',''],['POST','',input()],['PUT','/p',input()],['PATCH','/p/active',{is_active:false}]]) {
    const expected=role==='readonly' && method==='GET' ? 200 : role ? 403 : 401;
    assert.equal((await request(method,path,body,role)).status,expected);
  }
  assert.equal(connections,0);
  assert.equal(calls.length,1,'only the allowed GET may query the database');
  assert.ok(calls.every(sql=>sql.startsWith('SELECT')),'no writes from readonly');
});
test('create, edit, list and deactivate/reactivate preserve usage and identifiers',async()=>{
  const created=await request('POST','',input());assert.equal(created.status,201);const id=created.body.data.id;
  assert.equal(created.body.data.code,'DTO_10');assert.equal(created.body.data.is_active,true);assert.equal(audit.length,1);
  rows.get(id).current_uses=2;
  assert.equal((await request('PUT','/'+id,input({type:'fixed_amount',value:500,max_uses:3}))).status,200);
  assert.equal(rows.get(id).current_uses,2);
  for(const active of [false,true]) {const out=await request('PATCH','/'+id+'/active',{is_active:active});assert.equal(out.status,200);assert.equal(out.body.data.is_active,active);}
  assert.equal((await request('GET')).body.data.length,1);assert.equal(audit.length,4);
});
test('shipping discount requires value zero; percentage caps at 100; fixed amount must be positive',()=>{
  for(const p of [input({type:'free_shipping',value:0}),input({value:100}),input({type:'fixed_amount',value:0.01})]) assert.equal(promotionInput.safeParse(p).success,true);
  for(const p of [input({value:0}),input({value:100.01}),input({type:'free_shipping',value:1}),input({type:'fixed_amount',value:0})]) assert.equal(promotionInput.safeParse(p).success,false);
});
test('invalid dates, amounts, limits, unknown fields and types return 400 without a transaction',async()=>{
  for(const extra of [{valid_from:'not-date'},{valid_from:'2026-02-30'},{valid_from:'2026-13-01'},
    {valid_until:'2026-11-17'},{value:1.001},{value:10.000001},{value:-1},{value:'10'},{max_uses:0},{max_uses:1.5},
    {max_uses:2147483648},{min_order_amount:-1},{is_active:1},{type:'other'},{code:'BAD CODE'},{name:' '},{current_uses:0}]) {
    assert.equal((await request('POST','',input(extra))).status,400,JSON.stringify(extra));
  }
  assert.equal(connections,0);
  assert.equal(promotionInput.safeParse(input({valid_from:'2028-02-29',valid_until:'2028-02-29'})).success,true);
});
test('duplicate code (including case) is 409 and rolls back',async()=>{
  assert.equal((await request('POST','',input())).status,201);
  assert.equal((await request('POST','',input({code:'dto_10'}))).status,409);
  assert.equal(rows.size,1);assert.equal(audit.length,1);
});
test('max uses cannot fall below registered uses and unlimited is allowed',async()=>{
  const id=(await request('POST','',input())).body.data.id;rows.get(id).current_uses=3;
  assert.equal((await request('PUT','/'+id,input({max_uses:2}))).status,409);
  assert.equal((await request('PUT','/'+id,input({max_uses:3}))).status,200);
  assert.equal((await request('PUT','/'+id,input({max_uses:null}))).status,200);
  assert.equal(rows.get(id).current_uses,3);
});
test('missing promotion is 404; toggle rejects extra fields and string booleans',async()=>{
  assert.equal((await request('PUT','/missing',input())).status,404);
  assert.equal((await request('PATCH','/missing/active',{is_active:false})).status,404);
  assert.equal((await request('PATCH','/missing/active',{is_active:'false'})).status,400);
  assert.equal((await request('PATCH','/missing/active',{is_active:false,current_uses:0})).status,400);
});
test('audit failure rolls back create and edit, with no silent success',async()=>{
  failAudit=true;assert.equal((await request('POST','',input())).status,500);assert.equal(rows.size,0);
  failAudit=false;const id=(await request('POST','',input())).body.data.id;
  failAudit=true;assert.equal((await request('PUT','/'+id,input({name:'Changed'}))).status,500);
  assert.equal(rows.get(id).name,'Descuento');assert.equal(audit.length,1);
});
