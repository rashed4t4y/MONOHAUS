import { createHash, randomBytes } from 'node:crypto';
import { productFromRow, orderFromRow, transaction } from '../db.js';
import { assert } from '../lib/errors.js';
import { validatedCustomer } from '../lib/validation.js';
export const SHIPPING = { fee: 800, freeAt: 15000 };
export function normalizeItems(input) {
  assert(Array.isArray(input) && input.length > 0 && input.length <= 50,422,'Your bag must contain between 1 and 50 items.',{ items:'Please review the items in your bag.' });
  const combined = new Map();
  for (const item of input) {
    assert(item && Number.isSafeInteger(item.productId) && item.productId > 0 && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99,422,'An item has an invalid product or quantity.',{ items:'Use whole quantities between 1 and 99.' });
    const size = item.size ?? ''; const color = item.color ?? '';
    assert(typeof size === 'string' && size.length <= 40 && typeof color === 'string' && color.length <= 40,422,'An item has invalid options.',{ items:'Choose the product size and color again.' });
    const key = JSON.stringify([item.productId,size,color]);
    const old = combined.get(key);
    if (old) old.quantity += item.quantity;
    else combined.set(key,{productId:item.productId,quantity:item.quantity,size,color});
    assert(combined.get(key).quantity <= 99,422,'A bag item exceeds the maximum quantity.',{ items:'Use at most 99 of each item.' });
  }
  return [...combined.values()].sort((a,b) => a.productId-b.productId || a.size.localeCompare(b.size) || a.color.localeCompare(b.color));
}
export function quote(db,input) {
  const requested = normalizeItems(input); const stockByProduct = new Map();
  const items = requested.map(item => {
    const product = productFromRow(db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(item.productId));
    assert(product,409,'A product in your bag is no longer available.',{ items:'Remove unavailable products and try again.' });
    for (const [key,values] of [['size',product.sizes],['color',product.colors]]) assert(values.length ? values.includes(item[key]) : item[key] === '',422,`Choose a valid ${key} for ${product.name}.`,{ items:`Please check options for ${product.name}.` });
    const totalQuantity = (stockByProduct.get(product.id) || 0) + item.quantity;
    stockByProduct.set(product.id,totalQuantity);
    assert(totalQuantity <= product.stock,409,`Only ${product.stock} of ${product.name} remain.`,{ items:`Please reduce the quantity of ${product.name}.` });
    return { ...item,name:product.name,sku:product.sku,image:product.image,price:product.salePrice ?? product.price };
  });
  const subtotal = items.reduce((sum,item) => sum + item.price * item.quantity,0);
  const shipping = subtotal >= SHIPPING.freeAt ? 0 : SHIPPING.fee;
  return { items,subtotal,shipping,total:subtotal+shipping };
}
export function createOrder(db,user,input) {
  const key = input?.idempotencyKey;
  assert(typeof key === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(key),422,'A valid checkout request key is required. Please reload checkout.');
  const customer = validatedCustomer(input?.customer);
  const normalized = normalizeItems(input?.items);
  const requestHash = createHash('sha256').update(JSON.stringify({ customer,items:normalized })).digest('hex');
  return transaction(db, () => {
    const existing = db.prepare('SELECT * FROM orders WHERE user_id=? AND idempotency_key=?').get(user.id,key);
    if (existing) { assert(existing.request_hash === requestHash,409,'This checkout request was already used with different details. Refresh checkout to place another order.'); return { order:orderFromRow(db,existing),replayed:true }; }
    const totals = quote(db,normalized);
    const reference = `MH-${new Date().getUTCFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`;
    const id = db.prepare('INSERT INTO orders(reference,user_id,idempotency_key,request_hash,subtotal,shipping,total,customer) VALUES(?,?,?,?,?,?,?,?)').run(reference,user.id,key,requestHash,totals.subtotal,totals.shipping,totals.total,JSON.stringify(customer)).lastInsertRowid;
    const insert = db.prepare('INSERT INTO order_items(order_id,product_id,name,sku,image,price,quantity,size,color) VALUES(?,?,?,?,?,?,?,?,?)');
    const updateStock = db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=? AND active=1');
    for (const item of totals.items) {
      assert(updateStock.run(item.quantity,item.productId,item.quantity).changes === 1,409,'Stock has changed. Please review your bag.');
      insert.run(id,item.productId,item.name,item.sku,item.image,item.price,item.quantity,item.size,item.color);
    }
    return { order:orderFromRow(db,db.prepare('SELECT * FROM orders WHERE id=?').get(id)),replayed:false };
  });
}
export const transitions = { pending:['processing','cancelled'], processing:['shipped','cancelled'], shipped:['delivered'], delivered:[], cancelled:[] };
export function updateOrderStatus(db,id,status) {
  return transaction(db,() => {
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
    assert(order,404,'This order could not be found.');
    assert(transitions[order.status].includes(status),409,`An order cannot move from ${order.status} to ${String(status)}.`);
    if (status === 'cancelled') {
      for (const item of db.prepare('SELECT product_id,quantity FROM order_items WHERE order_id=?').all(id)) db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(item.quantity,item.product_id);
    }
    db.prepare("UPDATE orders SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").run(status,id);
    return orderFromRow(db,db.prepare('SELECT * FROM orders WHERE id=?').get(id));
  });
}
