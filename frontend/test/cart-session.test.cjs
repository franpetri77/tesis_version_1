// Stores reales de Zustand, con localStorage en memoria. Sin API ni dependencias nuevas.
// node --test test/cart-session.test.cjs
const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript');
const projectRequire=Module.createRequire(path.join(__dirname,'../package.json'));
const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
afterEach(()=>{
  if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else delete globalThis.localStorage;
  if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else delete globalThis.window;
});

function storage(){
  const data=new Map();
  return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
function runtime(saved=storage()){
  Object.defineProperty(globalThis,'localStorage',{configurable:true,writable:true,value:saved});
  Object.defineProperty(globalThis,'window',{configurable:true,writable:true,value:{localStorage:saved}});
  function load(name,cart){
    const file=path.join(__dirname,'../src/stores',name+'.ts');
    const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const m=new Module(file);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));
    m.require=id=>id==='./cartStore'?cart:projectRequire(id);m._compile(js,file);return m.exports;
  }
  const cart=load('cartStore');const auth=load('authStore',cart);
  return {saved,cart:cart.useCartStore,auth:auth.useAuthStore};
}
const account=(id,role='customer')=>({id,role,first_name:id,last_name:'Prueba',email:id+'@example.invalid'});
const product={id:'p-test',name:'Producto de prueba',slug:'producto-prueba',sku:'P-TEST',price:100,stock_quantity:10,images:[]};
const promotion={code:'PRUEBA',type:'fixed_amount',value:25};
function fill(r){r.cart.getState().addItem(product,2);r.cart.getState().applyPromotion(promotion);}
function empty(cart){
  const c=cart.getState();assert.deepEqual(c.items,[]);assert.equal(c.coupon_code,undefined);
  assert.equal(c.discount_amount,0);assert.equal(c.total_items,0);assert.equal(c.subtotal,0);assert.equal(c.total,0);
  assert.equal(c.toast.visible,false);assert.equal(c.toast.productName,'');
}

test('cerrar sesión de admin y entrar con otra cuenta no arrastra productos, cupón ni toast',()=>{
  const r=runtime();r.auth.getState().setUser(account('admin','admin'));fill(r);
  assert.equal(r.cart.getState().total,175);
  r.auth.getState().clearUser();empty(r.cart);
  r.auth.getState().setUser(account('cliente'));empty(r.cart);
});

test('el cambio directo de usuario también vacía el carrito',()=>{
  const r=runtime();r.auth.getState().setUser(account('a'));fill(r);
  r.auth.getState().setUser(account('b'));empty(r.cart);
  assert.equal(r.cart.getState().ownerId,'b');
});

test('actualizar o validar el perfil del mismo usuario conserva el carrito',()=>{
  const r=runtime();r.auth.getState().setUser(account('a'));fill(r);
  r.auth.getState().setUser({...account('a'),first_name:'Nombre actualizado'});
  assert.equal(r.cart.getState().items[0].quantity,2);
  assert.equal(r.cart.getState().coupon_code,'PRUEBA');assert.equal(r.cart.getState().total,175);
});

test('recargar la misma sesión conserva productos, cupón y totales correctos',()=>{
  const r=runtime();r.auth.getState().setUser(account('a'));fill(r);
  const again=runtime(r.saved);
  assert.equal(again.auth.getState().user.id,'a');assert.equal(again.cart.getState().ownerId,'a');
  assert.equal(again.cart.getState().items[0].quantity,2);assert.equal(again.cart.getState().coupon_code,'PRUEBA');
  assert.equal(again.cart.getState().total_items,2);assert.equal(again.cart.getState().subtotal,200);assert.equal(again.cart.getState().total,175);
  assert.equal(again.cart.getState().toast.visible,false);
});

test('el invitado conserva su selección al iniciar sesión, pero no después de salir de ella',()=>{
  const r=runtime();fill(r);r.auth.getState().clearUser(); // comprobación sin token siendo invitado
  assert.equal(r.cart.getState().items.length,1);
  r.auth.getState().setUser(account('a'));
  assert.equal(r.cart.getState().items.length,1);assert.equal(r.cart.getState().ownerId,'a');
  r.auth.getState().clearUser();empty(r.cart);
  const again=runtime(r.saved);empty(again.cart);assert.equal(again.cart.getState().ownerId,null);
});

test('un carrito de invitado sobrevive a la recarga sin iniciar sesión',()=>{
  const r=runtime();fill(r);const again=runtime(r.saved);
  assert.equal(again.cart.getState().items[0].quantity,2);assert.equal(again.cart.getState().ownerId,null);
  assert.equal(again.cart.getState().total,175);
});

test('rehidratar otra cuenta no le asigna el carrito persistido del usuario anterior',()=>{
  const r=runtime();r.auth.getState().setUser(account('a'));fill(r);
  r.saved.setItem('tele-import-auth',JSON.stringify({state:{user:account('b'),isAuthenticated:true},version:0}));
  const again=runtime(r.saved);empty(again.cart);assert.equal(again.cart.getState().ownerId,'b');
});

test('sin sesión guardada no se expone un carrito persistido con dueño',()=>{
  const r=runtime();r.auth.getState().setUser(account('a'));fill(r);
  r.saved.removeItem('tele-import-auth');const again=runtime(r.saved);
  empty(again.cart);assert.equal(again.cart.getState().ownerId,null);
});

test('la migración descarta el carrito global antiguo cuyo dueño no se puede conocer',()=>{
  const r=runtime();r.auth.getState().setUser(account('a'));fill(r);
  const legacy=JSON.parse(r.saved.getItem('tele-import-cart'));
  delete legacy.state.ownerId;legacy.version=0;
  r.saved.setItem('tele-import-cart',JSON.stringify(legacy));
  const again=runtime(r.saved);empty(again.cart);assert.equal(again.cart.getState().ownerId,'a');
  assert.equal(JSON.parse(r.saved.getItem('tele-import-cart')).version,1);
});
