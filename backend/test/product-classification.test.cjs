// No MySQL, real mail or persisted products. Stateful SQL double for rollback.
const {test,before,after,beforeEach}=require('node:test');const assert=require('node:assert/strict');
const express=require('express'),jwt=require('jsonwebtoken');
let product,tags,maps,audits,queries,failAudit=false,tx,server,base,staleSnapshot=false;
const clone=v=>structuredClone(v);const normalize=s=>s.replace(/\s+/g,' ').trim();
async function query(raw,a=[]){const s=normalize(raw);queries.push({s,a});
 if(s.includes('AS panel_role'))return [[{panel_role:a[0]==='admin'?'admin':'readonly'}],[]];
 if(s.startsWith('SELECT * FROM products WHERE id'))return [[clone(product)],[]];
 if(s.startsWith('SELECT p.*, c.name'))return [[clone(product)],[]];
 if(s.includes('FROM product_images'))return [[],[]];
 if(s.startsWith('SELECT t.id, t.name, t.slug'))return [[...maps].map(slug=>clone(tags.get(slug))),[]];
 if(s.startsWith('UPDATE products SET name')){Object.assign(product,{name:a[0]??product.name,slug:a[1],sku:a[2]??product.sku,price:a[3]??product.price,compare_price:a[4],category_id:a[5]??product.category_id,stock_quantity:a[6]??product.stock_quantity,brand:a[7],model:a[8],description:a[9],short_description:a[10],is_featured:a[11]??product.is_featured,is_active:a[12]??product.is_active});return [{affectedRows:1},[]];}
 if(s.startsWith('UPDATE products SET metadata')){product.metadata=a[0];return [{affectedRows:1},[]];}
 if(s.startsWith('DELETE FROM product_tag_map')){maps.clear();return [{},[]];}
 if(s.startsWith('INSERT INTO product_tags')){if(!tags.has(a[2]))tags.set(a[2],{id:a[0],name:a[1],slug:a[2]});return [{},[]];}
 if(s.startsWith('SELECT id FROM product_tags'))return [staleSnapshot && !s.endsWith('FOR UPDATE') ? [] : [{id:tags.get(a[0]).id}],[]];
 if(s.startsWith('INSERT INTO product_tag_map')){maps.add([...tags.values()].find(t=>t.id===a[1]).slug);return [{},[]];}
 if(s.startsWith('INSERT INTO audit_logs')){if(failAudit)throw Error('audit blocked');audits.push(a);return [{},[]];}
 if(s.startsWith('SELECT COUNT(*) as count'))return [[{count:1}],[]];
 if(s.startsWith('SELECT p.*, c.name as'))return [[clone(product)],[]];
 if(s.startsWith('SELECT t.id,t.name,t.slug,COUNT'))return [[...tags.values()],[]];
 return [[],[]];
}
const pool={query,getConnection:async()=>({query,beginTransaction:async()=>{tx={product:clone(product),tags:clone(tags),maps:clone(maps),audits:clone(audits)};},commit:async()=>{tx=null;},rollback:async()=>{({product,tags,maps,audits}=tx);tx=null;},release(){}})};
require.cache[require.resolve('../dist/db/database')]={exports:{__esModule:true,default:pool}};
require.cache[require.resolve('../dist/services/notifications')]={exports:{dispatch(){}}};
process.env.JWT_SECRET='classification-local-only-test';
const {classificationInput,parseMetadata,tagSlug}=require('../dist/services/productClassification');
const {adminRouter}=require('../dist/routes/admin');const {catalogRouter}=require('../dist/routes/catalog');
before(async()=>{const app=express();app.use(express.json());app.use('/admin',adminRouter);app.use('/catalog',catalogRouter);server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});base='http://127.0.0.1:'+server.address().port;});
after(()=>new Promise(r=>server.close(r)));
beforeEach(()=>{product={id:'p',name:'Mouse',slug:'mouse',sku:'M',price:10,compare_price:null,category_id:'c',stock_quantity:5,brand:null,model:null,description:null,short_description:null,is_featured:0,is_active:1,metadata:'{}'};tags=new Map();maps=new Set();audits=[];queries=[];failAudit=false;staleSnapshot=false;});
async function call(method,path,body,role='admin'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+jwt.sign({userId:role,role},process.env.JWT_SECRET)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
test('validation: bounded flat specs, labels and reserved keys; legacy malformed JSON renders empty',()=>{
 assert.equal(tagSlug('Conexión USB-C'),'conexion-usb-c');
 for(const body of [{tags:['!!!']},{tags:Array(21).fill('a')},{tags:[{}]},{metadata:{cpu:{nested:true}}},{metadata:{constructor:'x'}},{metadata:Object.fromEntries(Array.from({length:31},(_,i)=>['k'+i,'v']))}])assert.equal(classificationInput.safeParse(body).success,false,JSON.stringify(body));
 assert.deepEqual(parseMetadata('not json'),{});assert.deepEqual(parseMetadata('{"RAM":"8 GB","HDMI":true}'),{RAM:'8 GB',HDMI:true});
});
test('classification-only edit: tags deduplicate by normalized slug and metadata is audited',async()=>{
 const r=await call('PUT','/admin/products/p',{tags:['USB-C','usb c','Inalámbrico'],metadata:{RAM:'8 GB',HDMI:true}});
 assert.equal(r.status,200);assert.deepEqual([...maps].sort(),['inalambrico','usb-c']);assert.equal(r.body.data.tags.length,2);assert.deepEqual(r.body.data.metadata,{RAM:'8 GB',HDMI:true});
 assert.equal(audits.length,1);const next=JSON.parse(audits[0][6]);assert.deepEqual(next.tags,['inalambrico','usb-c']);assert.deepEqual(next.metadata,{RAM:'8 GB',HDMI:true});
});
test('audit failure rolls back product metadata, tag vocabulary and associations',async()=>{
 failAudit=true;const r=await call('PUT','/admin/products/p',{tags:['Nuevo'],metadata:{CPU:'AMD'}});assert.equal(r.status,500);assert.equal(tags.size,0);assert.equal(maps.size,0);assert.equal(product.metadata,'{}');assert.equal(audits.length,0);
});
test('omitted classification preserves values; empty arrays and objects clear them',async()=>{
 await call('PUT','/admin/products/p',{tags:['Audio'],metadata:{Color:'Negro'}});audits=[];
 assert.equal((await call('PUT','/admin/products/p',{name:'Mouse'})).status,200);assert.equal(maps.size,1);assert.deepEqual(JSON.parse(product.metadata),{Color:'Negro'});assert.equal(audits.length,0);
 await call('PUT','/admin/products/p',{tags:[],metadata:{}});assert.equal(maps.size,0);assert.equal(product.metadata,'{}');assert.equal(audits.length,1);
});
test('invalid classification is 400 before opening transaction; readonly writes remain 403',async()=>{
 assert.equal((await call('PUT','/admin/products/p',{tags:[4]})).status,400);assert.equal(tx,null);
 assert.equal((await call('PUT','/admin/products/p',{tags:['x']},'readonly')).status,403);assert.equal(maps.size,0);
});
test('catalog tag and search combine in both count and page queries through parameterized EXISTS',async()=>{
 const r=await call('GET','/catalog/products?tag=usb-c&search=Audio');assert.equal(r.status,200);
 const sql=queries.filter(q=>q.s.includes('WHERE p.is_active = 1') && q.s.includes('EXISTS'));
 assert.equal(sql.length,2);for(const q of sql){assert.match(q.s,/t.slug=\?/);assert.match(q.s,/st.name LIKE \?/);assert.equal(q.a[0],'usb-c');assert.equal(q.a[1],'%Audio%');}
 assert.equal((await call('GET','/catalog/products?tag=x&tag=y')).status,400);
});
test('catalog vocabulary exposes only assigned active tags, and detail parses specs',async()=>{
 await call('PUT','/admin/products/p',{tags:['Audio'],metadata:{Potencia:'20 W'}});
 const v=await call('GET','/catalog/tags');assert.equal(v.status,200);assert.ok(queries.some(q=>q.s.includes('WHERE p.is_active=1 GROUP BY')));
 const r=await call('GET','/catalog/products/mouse');assert.equal(r.status,200);assert.equal(r.body.data.tags[0].name,'Audio');assert.equal(r.body.data.metadata.Potencia,'20 W');
});

test('repeatable read: tag lookup after upsert uses a current locking read, not the stale snapshot',async()=>{
 staleSnapshot=true;
 const r=await call('PUT','/admin/products/p',{tags:['Compartida']});
 assert.equal(r.status,200);assert.equal(maps.size,1);
 assert.ok(queries.some(q=>q.s==='SELECT id FROM product_tags WHERE slug = ? FOR UPDATE'));
});
test('normalized metadata duplicate keys return 400 without losing either value',async()=>{
 const r=await call('PUT','/admin/products/p',{metadata:{Puertos:'HDMI','Puertos ':'USB'}});
 assert.equal(r.status,400);assert.match(r.body.error,/repetido/);assert.equal(product.metadata,'{}');
 assert.deepEqual(classificationInput.parse({metadata:{' Puertos ':'HDMI'}}).metadata,{Puertos:'HDMI'});
});
test('reachable validation errors are in Spanish',()=>{
 const cases=[{tags:['x'.repeat(101)]},{tags:['']},{metadata:{Puertos:'x'.repeat(501)}}];
 for(const input of cases){const result=classificationInput.safeParse(input);assert.equal(result.success,false);assert.match(result.error.issues[0].message,/no puede|no pueden/);assert.doesNotMatch(result.error.issues[0].message,/String must/);}
});
