import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../app.js';
import { openDatabase } from '../db.js';
import { verifyPassword } from '../lib/passwords.js';
import { additionalProducts } from '../seed.js';
const PASSWORD = 'a-long-test-password-2026';
const customer = {name:'Alex Doe',email:'alex@example.test',phone:'+1 212 555 0198',address:'12 Studio Street',city:'New York',postalCode:'10001',notes:'Leave with reception.'};
function item(product,quantity=1) { return {productId:product.id,quantity,size:product.sizes[0] || '',color:product.colors[0] || ''}; }
async function fixture(t,options={}) {
  const db = openDatabase(':memory:'); const app = createApp({db,sessionSecret:'test-secret-with-at-least-32-characters',authLimit:100,...options});
  const server = app.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); app.locals.close(); db.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const actor = () => ({cookie:'',csrf:''});
  async function request(agent,path,{method='GET',body,headers={}}={}) {
    const response = await fetch(`${url}/api${path}`,{method,headers:{...(agent.cookie ? {cookie:agent.cookie} : {}),...(body ? {'content-type':'application/json'} : {}),...(method !== 'GET' ? {'x-csrf-token':agent.csrf} : {}),...headers},...(body ? {body:JSON.stringify(body)} : {})});
    const cookie = response.headers.getSetCookie()[0]; if (cookie) agent.cookie = cookie.split(';')[0];
    const data = await response.json(); if (data.csrfToken) agent.csrf = data.csrfToken;
    return {status:response.status,data,headers:response.headers};
  }
  async function register(email='alex@example.test') {
    const agent=actor(); await request(agent,'/auth/session');
    const result=await request(agent,'/auth/register',{method:'POST',body:{name:'Alex Doe',email,password:PASSWORD,role:'admin'}});
    assert.equal(result.status,201); return agent;
  }
  return {db,request,register,actor};
}

test('catalog reads SQLite, filters real data, sorts cents, paginates and handles missing products',async t => {
  const {db,request,actor}=await fixture(t); const agent=actor();
  const catalog=await request(agent,'/products?limit=3'); assert.equal(catalog.status,200); assert.equal(catalog.data.products.length,3); assert.equal(catalog.data.total,20); assert.equal(catalog.data.pages,7);
  assert.equal(db.prepare('SELECT COUNT(DISTINCT sku) AS n FROM products').get().n,20);
  assert.deepEqual(Object.fromEntries(db.prepare('SELECT category,COUNT(*) AS count FROM products GROUP BY category ORDER BY category').all().map(row => [row.category,row.count])),{Accessories:4,Bags:3,Clothing:6,Footwear:1,Lifestyle:1,Sneakers:3,Watches:2});
  for (const {image} of db.prepare('SELECT image FROM products').all()) assert.ok(existsSync(fileURLToPath(new URL(`../../client/public${image}`,import.meta.url))),image);
  assert.equal((await request(agent,'/products?category=Sneakers')).data.total,3);
  assert.equal((await request(agent,'/products?category=Watches')).data.total,2);
  assert.equal(db.prepare('SELECT image FROM products WHERE sku=?').get('MH-AC-003').image,'/assets/fallback.svg');
  const next=await request(agent,'/products?limit=3&page=2'); assert.equal(next.data.products.length,3); assert.notEqual(next.data.products[0].id,catalog.data.products[0].id);
  const found=await request(agent,'/products?search=trench&category=Clothing'); assert.equal(found.data.total,1); assert.match(found.data.products[0].name,/Trench/);
  const sorted=await request(agent,'/products?sort=price-asc'); const prices=sorted.data.products.map(p=>p.salePrice ?? p.price); assert.deepEqual(prices,[...prices].sort((a,b)=>a-b));
  const detail=await request(agent,`/products/${found.data.products[0].id}`); assert.equal(detail.data.product.sku,'MH-CL-003');
  assert.equal((await request(agent,'/products/garbage')).status,404); assert.equal((await request(agent,'/products/99999')).status,404);
  assert.equal((await request(agent,'/products?search=%27%20OR%201%3D1--')).data.total,0);
  db.prepare('UPDATE products SET price=12345,sale_price=NULL WHERE id=1').run(); assert.equal((await request(agent,'/products/1')).data.product.price,12345);
  db.prepare('UPDATE products SET name=? WHERE id=1').run('50% ! Studio_Sample');
  for (const literal of ['%', '_', '!']) assert.equal((await request(agent,`/products?search=${encodeURIComponent(literal)}`)).data.total,1,`Search must match literal ${literal}`);
});

test('session CSRF and origin checks reject forged mutations',async t => {
  const {request,actor}=await fixture(t); const agent=actor();
  assert.equal((await request(agent,'/auth/login',{method:'POST',body:{email:'a@example.test',password:PASSWORD}})).status,403);
  const session=await request(agent,'/auth/session'); assert.match(session.headers.get('set-cookie'),/HttpOnly/); assert.match(session.headers.get('set-cookie'),/SameSite=Lax/);
  assert.equal((await request(agent,'/newsletter',{method:'POST',body:{email:'a@example.test'},headers:{origin:'https://evil.example'}})).status,403);
  assert.equal((await request(agent,'/newsletter',{method:'POST',body:{email:'a@example.test'},headers:{'x-csrf-token':'wrong'}})).status,403);
  assert.equal((await request(agent,'/newsletter',{method:'POST',body:{email:'a@example.test'}})).status,200);
});

test('registration hashes passwords, ignores roles, validates fields and enforces unique email',async t => {
  const {db,request,register,actor}=await fixture(t); const agent=await register();
  const row=db.prepare('SELECT * FROM users').get(); assert.equal(row.role,'customer'); assert.notEqual(row.password_hash,PASSWORD); assert.ok(await verifyPassword(PASSWORD,row.password_hash));
  const account=await request(agent,'/account'); assert.equal(account.data.user.email,'alex@example.test'); assert.equal(account.data.user.password_hash,undefined);
  const duplicate=actor(); await request(duplicate,'/auth/session');
  assert.equal((await request(duplicate,'/auth/register',{method:'POST',body:{name:'Alex Doe',email:'ALEX@EXAMPLE.TEST',password:PASSWORD}})).status,409);
  const invalid=await request(duplicate,'/auth/register',{method:'POST',body:{name:'A',email:'wrong',password:'short'}}); assert.equal(invalid.status,422); assert.ok(invalid.data.fields.password);
});

test('login rotates the session, logout revokes access, and bad passwords fail',async t => {
  const {request,register,actor}=await fixture(t); const agent=await register();
  await request(agent,'/auth/logout',{method:'POST',body:{}}); assert.equal((await request(agent,'/account')).status,401);
  const oldCookie=agent.cookie; const oldCsrf=agent.csrf;
  assert.equal((await request(agent,'/auth/login',{method:'POST',body:{email:'alex@example.test',password:'wrong password'}})).status,401);
  assert.equal((await request(agent,'/auth/login',{method:'POST',body:{email:'alex@example.test',password:PASSWORD}})).status,200);
  assert.notEqual(agent.cookie,oldCookie); assert.notEqual(agent.csrf,oldCsrf);
  const stolen=actor(); stolen.cookie=oldCookie; assert.equal((await request(stolen,'/account')).status,401);
  const loggedInCookie=agent.cookie; await request(agent,'/auth/logout',{method:'POST',body:{}}); stolen.cookie=loggedInCookie; assert.equal((await request(stolen,'/account')).status,401);
});

test('checkout uses trusted prices and shipping, saves snapshots and handles duplicates once',async t => {
  const {db,request,register}=await fixture(t); const agent=await register();
  const product=(await request(agent,'/products/8')).data.product; const before=product.stock;
  const body={customer,items:[{...item(product,2),price:1}],idempotencyKey:'checkout-test-key-0001',shipping:0,total:1};
  const q=await request(agent,'/checkout/quote',{method:'POST',body}); assert.equal(q.status,200); assert.equal(q.data.total,product.price*2+800);
  const created=await request(agent,'/checkout',{method:'POST',body}); assert.equal(created.status,201); assert.equal(created.data.order.total,10400); assert.equal(created.data.order.items[0].price,4800);
  assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product.id).stock,before-2);
  const repeated=await request(agent,'/checkout',{method:'POST',body}); assert.equal(repeated.status,200); assert.equal(repeated.data.order.id,created.data.order.id); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
  assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(product.id).stock,before-2);
  assert.equal((await request(agent,'/checkout',{method:'POST',body:{...body,items:[item(product,3)]}})).status,409);
  assert.equal((await request(agent,`/orders/${created.data.order.id}`)).status,200);
  const other=await register('other@example.test'); assert.equal((await request(other,`/orders/${created.data.order.id}`)).status,404);
  db.prepare('UPDATE products SET price=5000 WHERE id=8').run(); assert.equal((await request(agent,`/orders/${created.data.order.id}`)).data.order.items[0].price,4800);
});

test('checkout rejects invalid variants, quantities and aggregate stock without changing data',async t => {
  const {db,request,register}=await fixture(t); const agent=await register(); const product=(await request(agent,'/products/8')).data.product;
  const submit=items=>request(agent,'/checkout',{method:'POST',body:{customer,items,idempotencyKey:'invalid-items-key-001'}});
  assert.equal((await submit([{...item(product),size:'XXXL'}])).status,422);
  assert.equal((await submit([item(product,0)])).status,422); assert.equal((await submit([item(product,1.5)])).status,422);
  assert.equal((await submit([{...item(product,20),size:'S'},{...item(product,20),size:'M'}])).status,409);
  db.prepare('UPDATE products SET stock=0 WHERE id=1').run();
  const empty=(await request(agent,'/products/1')).data.product;
  assert.equal((await submit([item(product),item(empty)])).status,409);
  assert.equal(db.prepare('SELECT stock FROM products WHERE id=8').get().stock,product.stock); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
  const invalidCustomer=await request(agent,'/checkout',{method:'POST',body:{customer:{...customer,email:'bad'},items:[item(product)],idempotencyKey:'invalid-customer-01'}}); assert.equal(invalidCustomer.status,422); assert.ok(invalidCustomer.data.fields.email);
});

test('concurrent checkout cannot oversell the final unit and free shipping is recalculated',async t => {
  const {db,request,register}=await fixture(t); const first=await register(); const second=await register('second@example.test');
  db.prepare('UPDATE products SET stock=1,price=16000 WHERE id=1').run(); const product=(await request(first,'/products/1')).data.product;
  const responses=await Promise.all([first,second].map((agent,index)=>request(agent,'/checkout',{method:'POST',body:{customer,items:[item(product)],idempotencyKey:`concurrent-request-${index}`}})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]); assert.equal(db.prepare('SELECT stock FROM products WHERE id=1').get().stock,0);
  const order=responses.find(r=>r.status===201).data.order; assert.equal(order.shipping,0); assert.equal(order.total,16000);
});

test('admin endpoints reject unauthenticated and ordinary users for every operation',async t => {
  const {request,register,actor}=await fixture(t); const anonymous=actor(); await request(anonymous,'/auth/session'); const user=await register();
  for (const [path,method] of [['/admin/products','GET'],['/admin/products','POST'],['/admin/products/1','PATCH'],['/admin/products/1','DELETE'],['/admin/orders','GET'],['/admin/orders/1','PATCH']]) {
    assert.equal((await request(anonymous,path,{method,...(method==='GET'?{}:{body:{}})})).status,401);
    assert.equal((await request(user,path,{method,...(method==='GET'?{}:{body:{}})})).status,403);
  }
});

test('admin product management validates cents, protects active orders, and archives safely',async t => {
  const {db,request,register}=await fixture(t); const admin=await register(); db.prepare("UPDATE users SET role='admin'").run();
  const product={name:'Studio Sample',description:'A neutral sample item for the local demo.',category:'Lifestyle',sku:'MH-TEST-001',price:2500,stock:5,image:'/assets/ceramic-cup.jpg',sizes:[],colors:[],images:[],isNew:false,featured:false};
  assert.equal((await request(admin,'/admin/products',{method:'POST',body:{...product,price:25.5}})).status,422);
  const created=await request(admin,'/admin/products',{method:'POST',body:product}); assert.equal(created.status,201); const id=created.data.product.id;
  const categorized=await request(admin,'/admin/products',{method:'POST',body:{...product,name:'Watch Category Sample',category:'Watches',sku:'MH-TEST-002'}}); assert.equal(categorized.status,201);
  assert.equal((await request(admin,`/admin/products/${id}`,{method:'PATCH',body:{price:3000,stock:7}})).data.product.price,3000);
  const order=(await request(admin,'/checkout',{method:'POST',body:{customer,items:[{productId:id,quantity:1}],idempotencyKey:'admin-active-order-01'}})).data.order;
  assert.equal((await request(admin,`/admin/products/${id}`,{method:'DELETE',body:{confirmation:product.sku}})).status,409);
  assert.equal((await request(admin,`/admin/orders/${order.id}`,{method:'PATCH',body:{status:'shipped'}})).status,409);
  assert.equal((await request(admin,`/admin/orders/${order.id}`,{method:'PATCH',body:{status:'processing'}})).status,200);
  assert.equal((await request(admin,`/admin/orders/${order.id}`,{method:'PATCH',body:{status:'cancelled'}})).status,200);
  assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(id).stock,7);
  assert.equal((await request(admin,`/admin/orders/${order.id}`,{method:'PATCH',body:{status:'cancelled'}})).status,409); assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(id).stock,7);
  assert.equal((await request(admin,`/admin/products/${id}`,{method:'DELETE',body:{confirmation:'wrong'}})).status,422);
  assert.equal((await request(admin,`/admin/products/${id}`,{method:'DELETE',body:{confirmation:product.sku}})).status,200);
  assert.equal((await request(admin,`/products/${id}`)).status,404); assert.equal((await request(admin,'/admin/orders')).data.orders.length,1);
});

test('authentication rate limits repeated attempts',async t => {
  const {request,actor}=await fixture(t,{authLimit:2}); const agent=actor(); await request(agent,'/auth/session');
  for (let i=0;i<2;i++) assert.equal((await request(agent,'/auth/login',{method:'POST',body:{email:'nobody@example.test',password:PASSWORD}})).status,401);
  assert.equal((await request(agent,'/auth/login',{method:'POST',body:{email:'nobody@example.test',password:PASSWORD}})).status,429);
});

test('newsletter saves a local record once and clearly reports no email delivery',async t => {
  const {db,request,actor}=await fixture(t); const agent=actor(); await request(agent,'/auth/session');
  const response=await request(agent,'/newsletter',{method:'POST',body:{email:'reader@example.test'}}); assert.equal(response.status,200); assert.equal(response.data.demo,true); assert.match(response.data.message,/No email/);
  await request(agent,'/newsletter',{method:'POST',body:{email:'reader@example.test'}}); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM newsletter').get().n,1);
});

test('database migrations add catalog products once and preserve existing data',() => {
  const directory=mkdtempSync(join(tmpdir(),'monohaus-test-')); const filename=join(directory,'store.sqlite');
  try {
    const db=openDatabase(filename);
    const skus=additionalProducts.map(product => product.sku);
    db.prepare(`DELETE FROM products WHERE sku IN (${skus.map(() => '?').join(',')})`).run(...skus);
    db.prepare('DELETE FROM migrations WHERE version=3').run();
    db.prepare('UPDATE products SET stock=2 WHERE id=1').run();
    db.close();
    const reopened=openDatabase(filename);
    assert.equal(reopened.prepare('SELECT stock FROM products WHERE id=1').get().stock,2);
    assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM products').get().n,20);
    assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM migrations WHERE version=3').get().n,1);
    reopened.close();
    const repeated=openDatabase(filename);
    assert.equal(repeated.prepare('SELECT COUNT(*) AS n FROM products').get().n,20);
    repeated.close();
  }
  finally { rmSync(directory,{recursive:true,force:true}); }
});

test('image metadata migration corrects seeded paths without overwriting edited images',() => {
  const directory=mkdtempSync(join(tmpdir(),'monohaus-photo-test-')); const filename=join(directory,'store.sqlite');
  try {
    const db=openDatabase(filename);
    db.prepare('DELETE FROM migrations WHERE version=4').run();
    db.prepare('UPDATE products SET image=? WHERE sku=?').run('/assets/everyday-canvas-tote.jpg','MH-BG-002');
    db.prepare('UPDATE products SET image=? WHERE sku=?').run('/assets/minimal-crossbody-bag.jpg','MH-BG-003');
    db.prepare('UPDATE products SET image=?,colors=? WHERE sku=?').run('/assets/classic-leather-strap-watch.jpg','["Black"]','MH-WT-001');
    db.prepare('UPDATE products SET colors=? WHERE sku=?').run('["Brown"]','MH-CL-004');
    db.prepare('UPDATE products SET colors=? WHERE sku=?').run('["White"]','MH-CL-005');
    db.prepare('UPDATE products SET colors=? WHERE sku=?').run('["Black"]','MH-WT-002');
    db.prepare('UPDATE products SET image=? WHERE sku=?').run('/assets/fallback.svg','MH-BG-002');
    db.close();
    const migrated=openDatabase(filename);
    assert.equal(migrated.prepare('SELECT image FROM products WHERE sku=?').get('MH-BG-002').image,'/assets/fallback.svg');
    assert.equal(migrated.prepare('SELECT image FROM products WHERE sku=?').get('MH-BG-003').image,'/assets/patterned-crossbody-bag.jpg');
    assert.equal(migrated.prepare('SELECT image FROM products WHERE sku=?').get('MH-WT-001').image,'/assets/classic-strap-watch.jpg');
    assert.deepEqual(JSON.parse(migrated.prepare('SELECT colors FROM products WHERE sku=?').get('MH-CL-004').colors),['Coral']);
    assert.deepEqual(JSON.parse(migrated.prepare('SELECT colors FROM products WHERE sku=?').get('MH-CL-005').colors),['Sage']);
    assert.deepEqual(JSON.parse(migrated.prepare('SELECT colors FROM products WHERE sku=?').get('MH-WT-001').colors),['Brown']);
    assert.deepEqual(JSON.parse(migrated.prepare('SELECT colors FROM products WHERE sku=?').get('MH-WT-002').colors),['Black','Orange']);
    migrated.close();
  }
  finally { rmSync(directory,{recursive:true,force:true}); }
});

test('production requires secure configuration',() => {
  assert.throws(()=>createApp({production:true,sessionSecret:'short'}),/SESSION_SECRET/);
  assert.throws(()=>createApp({production:true,sessionSecret:'long-enough-secret-for-production-but-no-origin'}),/APP_ORIGIN/);
});


test('administrator CLI accepts hidden stdin data and stores only a password hash',async () => {
  const directory=mkdtempSync(join(tmpdir(),'monohaus-admin-test-')); const filename=join(directory,'store.sqlite');
  try {
    const script=fileURLToPath(new URL('../scripts/create-admin.js',import.meta.url));
    const result=spawnSync(process.execPath,[script,'--stdin-json'],{env:{...process.env,DATABASE_PATH:filename},input:JSON.stringify({name:'Test Administrator',email:'admin@example.test',password:PASSWORD}),encoding:'utf8'});
    assert.equal(result.status,0,result.stderr); assert.ok(!result.stdout.includes(PASSWORD)); assert.match(result.stdout,/Administrator created/);
    const db=openDatabase(filename); const admin=db.prepare('SELECT * FROM users WHERE email=?').get('admin@example.test');
    assert.equal(admin.role,'admin'); assert.ok(await verifyPassword(PASSWORD,admin.password_hash)); db.close();
  } finally { rmSync(directory,{recursive:true,force:true}); }
});
