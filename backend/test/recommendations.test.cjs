// T2 regression requested in Claude's review. No database connection or writes.
const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');const jwt=require('jsonwebtoken');
let calls,rows=[];
const pool={query:async(sql,args=[])=>{calls.push({sql,args});return [sql.includes('FROM product_images')?[]:structuredClone(rows),[]];}};
require.cache[require.resolve('../dist/db/database')]={exports:{__esModule:true,default:pool}};
process.env.JWT_SECRET='recommendations-local-tests';
const {catalogRouter}=require('../dist/routes/catalog');
const {getRecommendedProducts}=require('../dist/services/recommendations');
let server,base;
before(()=>new Promise(r=>{const app=express();app.use('/catalog',catalogRouter);server=app.listen(0,'127.0.0.1',()=>{base='http://127.0.0.1:'+server.address().port;r();});}));
after(()=>new Promise(r=>server.close(r)));
beforeEach(()=>{calls=[];rows=[];});
async function request(path,token){const res=await fetch(base+'/catalog/recommendations'+path,{headers:token?{Authorization:'Bearer '+token}:{}});return {status:res.status,body:await res.json(),cache:res.headers.get('cache-control')};}
const token=jwt.sign({userId:'authenticated-user',role:'customer'},process.env.JWT_SECRET);
test('personal history requires valid JWT and is never publicly cached',async()=>{
  for(const t of [undefined,'fake',jwt.sign({userId:'u',role:'customer'},'wrong')]) {const out=await request('/personal',t);assert.equal(out.status,401);assert.match(out.cache,/private, no-store/);}
  assert.equal(calls.length,0);
});
test('all contexts validate integer limits between 1 and 12 before querying',async()=>{
  for(const v of ['0','13','-1','1.5','abc','1&limit=2']) for(const scope of ['', '/personal']) {
    assert.equal((await request(scope+'?limit='+v,token)).status,400);
  }
  assert.equal(calls.length,0);
  assert.equal((await request('?limit=12')).status,200);assert.deepEqual(calls[0].args,[12]);
});
test('array, empty and overlong product/order identifiers are rejected',async()=>{
  for(const value of ['', 'x'.repeat(51),'a&product_id=b']) assert.equal((await request('?product_id='+value)).status,400);
  for(const value of ['', 'x'.repeat(51),'a&order_id=b']) assert.equal((await request('/personal?order_id='+value,token)).status,400);
  assert.equal(calls.length,0);
});
test('user identity comes only from JWT; ownership and accepted payment states constrain order history',async()=>{
  await request('/personal?user_id=attacker&order_id=order-1&limit=3',token);
  assert.deepEqual(calls[0].args,['authenticated-user','order-1',3]);
  const sql=calls[0].sql;
  assert.match(sql,/user_id = \?/);assert.match(sql,/AND id = \?/);
  assert.match(sql,/AND EXISTS \(SELECT 1 FROM eligible_orders\)/);
  assert.match(sql,/'paid','processing','ready_to_ship','shipped','delivered'/);
});
test('history excludes purchased products, inactive products/categories and exhausted stock',async()=>{
  await getRecommendedProducts({kind:'history',userId:'u'},4);
  const {sql,args}=calls[0];assert.deepEqual(args,['u',4]);
  for(const fragment of ['p.is_active = 1','p.stock_quantity > 0','c.is_active = 1','NOT EXISTS (SELECT 1 FROM purchases bought WHERE bought.product_id = p.id)']) assert.ok(sql.includes(fragment));
  assert.match(sql,/SUM\(i.quantity\)/);assert.match(sql,/ORDER BY pref.units DESC/);
});
test('related product uses parameter binding and excludes current product',async()=>{
  const id="x' OR 1=1 --";await getRecommendedProducts({kind:'product',productId:id},2);
  assert.deepEqual(calls[0].args,[id,2]);assert.ok(!calls[0].sql.includes(id));
  assert.match(calls[0].sql,/current.category_id = p.category_id/);assert.match(calls[0].sql,/p.id <> current.id/);
});
test('catalog fallback is deterministic; response strips score and attaches images',async()=>{
  rows=[{id:'p',name:'Temporary response',matched_category:0}];
  const out=await request('');assert.equal(out.status,200);assert.equal(out.body.matched,false);
  assert.deepEqual(out.body.data,[{id:'p',name:'Temporary response',images:[]}]);
  assert.match(calls[0].sql,/p.is_featured DESC, p.created_at DESC, p.id ASC/);
  assert.deepEqual(calls[1].args,['p']);
});
test('matched metadata is truthful and an empty result remains empty',async()=>{
  rows=[{id:'p',matched_category:1}];assert.equal((await request('/personal',token)).body.matched,true);
  rows=[];assert.deepEqual((await request('/personal?order_id=missing',token)).body,{data:[],matched:false});
});
