import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { additionalProducts, products as seedProducts } from './seed.js';
export const defaultDatabasePath = fileURLToPath(new URL('./data/monohaus.sqlite', import.meta.url));
export function openDatabase(filename = process.env.DATABASE_PATH || defaultDatabasePath) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  migrate(db); return db;
}
function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));`);
  if (!db.prepare('SELECT version FROM migrations WHERE version=1').get()) {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
      CREATE TABLE sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE INDEX sessions_expiry ON sessions(expires);
      CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, sku TEXT NOT NULL UNIQUE, price INTEGER NOT NULL CHECK(price>0), sale_price INTEGER CHECK(sale_price>0 AND sale_price<price), stock INTEGER NOT NULL CHECK(stock>=0), image TEXT NOT NULL, images TEXT NOT NULL DEFAULT '[]', sizes TEXT NOT NULL DEFAULT '[]', colors TEXT NOT NULL DEFAULT '[]', is_new INTEGER NOT NULL DEFAULT 0, featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
      CREATE INDEX products_category ON products(active,category,created_at);
      CREATE INDEX products_price ON products(active,price);
      CREATE TABLE orders (id INTEGER PRIMARY KEY, reference TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES users(id), idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled')), subtotal INTEGER NOT NULL CHECK(subtotal>=0), shipping INTEGER NOT NULL CHECK(shipping>=0), total INTEGER NOT NULL CHECK(total=subtotal+shipping), customer TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(user_id,idempotency_key));
      CREATE INDEX orders_user ON orders(user_id,created_at DESC);
      CREATE INDEX orders_status ON orders(status,created_at DESC);
      CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), name TEXT NOT NULL, sku TEXT NOT NULL, image TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>0), quantity INTEGER NOT NULL CHECK(quantity>0), size TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '');
      CREATE INDEX order_items_order ON order_items(order_id);
      CREATE INDEX order_items_product ON order_items(product_id);
      CREATE TABLE newsletter (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
      INSERT INTO migrations(version) VALUES(1);
      COMMIT;`);
  }
  if (!db.prepare('SELECT version FROM migrations WHERE version=2').get()) {
    const insert = db.prepare('INSERT INTO products(name,description,category,sku,price,sale_price,stock,image,images,sizes,colors,is_new,featured) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
    transaction(db, () => {
      for (const p of seedProducts) insert.run(p.name,p.description,p.category,p.sku,p.price,p.salePrice ?? null,p.stock,p.image,JSON.stringify(p.images || []),JSON.stringify(p.sizes || []),JSON.stringify(p.colors || []),Number(p.isNew),Number(p.featured));
      db.prepare('INSERT INTO migrations(version) VALUES(2)').run();
    });
  }
  if (!db.prepare('SELECT version FROM migrations WHERE version=3').get()) {
    const findSku = db.prepare('SELECT name,category FROM products WHERE sku=? COLLATE NOCASE');
    const findEquivalent = db.prepare('SELECT id FROM products WHERE name=? COLLATE NOCASE AND category=? COLLATE NOCASE');
    const insert = db.prepare('INSERT INTO products(name,description,category,sku,price,sale_price,stock,image,images,sizes,colors,is_new,featured) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
    transaction(db, () => {
      if (db.prepare('SELECT version FROM migrations WHERE version=3').get()) return;
      for (const p of additionalProducts) {
        const existingSku = findSku.get(p.sku);
        if (existingSku) {
          if (existingSku.name !== p.name || existingSku.category !== p.category) throw new Error(`Migration 3 found a conflicting product SKU: ${p.sku}`);
          continue;
        }
        if (findEquivalent.get(p.name,p.category)) continue;
        insert.run(p.name,p.description,p.category,p.sku,p.price,p.salePrice ?? null,p.stock,p.image,JSON.stringify(p.images || []),JSON.stringify(p.sizes || []),JSON.stringify(p.colors || []),Number(p.isNew),Number(p.featured));
      }
      db.prepare('INSERT INTO migrations(version) VALUES(3)').run();
    });
  }
  if (!db.prepare('SELECT version FROM migrations WHERE version=4').get()) {
    const imageUpdates = [
      ['MH-BG-002','Everyday Tote Bag','/assets/everyday-canvas-tote.jpg','/assets/everyday-tote-bag.jpg'],
      ['MH-BG-003','Patterned Crossbody Bag','/assets/minimal-crossbody-bag.jpg','/assets/patterned-crossbody-bag.jpg'],
      ['MH-WT-001','Classic Strap Watch','/assets/classic-leather-strap-watch.jpg','/assets/classic-strap-watch.jpg']
    ];
    const colorUpdates = [
      ['MH-CL-004','Essential Overshirt',['Brown'],['Coral']],
      ['MH-CL-005','Relaxed Fit Button-Down Shirt',['White'],['Sage']],
      ['MH-WT-001','Classic Strap Watch',['Black'],['Brown']],
      ['MH-WT-002','Minimal Digital Watch',['Black'],['Black','Orange']]
    ];
    const descriptionUpdates = [
      ['MH-CL-004','Essential Overshirt','A warm neutral overshirt with a relaxed shape for easy layering. This fictional demo listing is represented by licensed photography; supplier and material details are not asserted.','A coral overshirt with a relaxed shape for easy layering. This fictional demo listing is represented by licensed photography; supplier and material details are not asserted.'],
      ['MH-CL-005','Relaxed Fit Button-Down Shirt','A long-sleeved button-front shirt in a muted neutral shade. This fictional demo listing is represented by licensed photography; supplier and fabric details are not asserted.','A muted sage button-front shirt with a simple, relaxed silhouette. This fictional demo listing is represented by licensed photography; supplier and fabric details are not asserted.']
    ];
    const updateImage = db.prepare('UPDATE products SET image=? WHERE sku=? AND name=? AND image=?');
    const updateColors = db.prepare('UPDATE products SET colors=? WHERE sku=? AND name=? AND colors=?');
    const updateDescription = db.prepare('UPDATE products SET description=? WHERE sku=? AND name=? AND description=?');
    transaction(db, () => {
      if (db.prepare('SELECT version FROM migrations WHERE version=4').get()) return;
      for (const [sku,name,oldImage,newImage] of imageUpdates) updateImage.run(newImage,sku,name,oldImage);
      for (const [sku,name,oldColors,newColors] of colorUpdates) updateColors.run(JSON.stringify(newColors),sku,name,JSON.stringify(oldColors));
      for (const [sku,name,oldDescription,newDescription] of descriptionUpdates) updateDescription.run(newDescription,sku,name,oldDescription);
      db.prepare('INSERT INTO migrations(version) VALUES(4)').run();
    });
  }
}
export function transaction(db, callback) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = callback(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function productFromRow(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, description: row.description, category: row.category, sku: row.sku, price: row.price, salePrice: row.sale_price, stock: row.stock, image: row.image, images: JSON.parse(row.images), sizes: JSON.parse(row.sizes), colors: JSON.parse(row.colors), isNew: Boolean(row.is_new), featured: Boolean(row.featured), active: Boolean(row.active), createdAt: row.created_at };
}
export function publicUser(row) { return row ? { id: row.id, name: row.name, email: row.email, role: row.role } : null; }
export function orderFromRow(db, row) {
  if (!row) return null;
  return { id: row.id, reference: row.reference, status: row.status, subtotal: row.subtotal, shipping: row.shipping, total: row.total, customer: JSON.parse(row.customer), createdAt: row.created_at, updatedAt: row.updated_at, paymentMethod: 'cash_on_delivery', items: db.prepare('SELECT id,product_id AS productId,name,sku,image,price,quantity,size,color FROM order_items WHERE order_id=? ORDER BY id').all(row.id) };
}
