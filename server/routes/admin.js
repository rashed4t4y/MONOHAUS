import { Router } from 'express';
import { requireAdmin } from '../lib/security.js';
import { productFromRow, orderFromRow } from '../db.js';
import { listProducts } from './products.js';
import { validatedProduct } from '../lib/validation.js';
import { assert, HttpError } from '../lib/errors.js';
import { updateOrderStatus, transitions } from '../services/orders.js';
export function adminRoutes(db) {
  const router = Router(); router.use(requireAdmin);
  router.get('/products',(req,res) => res.json(listProducts(db,req.query,true)));
  const parameters = p => [p.name,p.description,p.category,p.sku,p.price,p.salePrice,p.stock,p.image,JSON.stringify(p.images),JSON.stringify(p.sizes),JSON.stringify(p.colors),Number(p.isNew),Number(p.featured)];
  router.post('/products',(req,res) => {
    const p = validatedProduct(req.body);
    assert(!db.prepare('SELECT id FROM products WHERE sku=?').get(p.sku),409,'This SKU already exists.',{ sku:'Choose a unique SKU.' });
    const id = db.prepare('INSERT INTO products(name,description,category,sku,price,sale_price,stock,image,images,sizes,colors,is_new,featured) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(...parameters(p)).lastInsertRowid;
    res.status(201).json({ product:productFromRow(db.prepare('SELECT * FROM products WHERE id=?').get(id)) });
  });
  router.patch('/products/:id',(req,res) => {
    const old = productFromRow(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
    assert(old,404,'This product could not be found.');
    const p = validatedProduct(req.body,old);
    assert(!db.prepare('SELECT id FROM products WHERE sku=? AND id<>?').get(p.sku,old.id),409,'This SKU already exists.',{ sku:'Choose a unique SKU.' });
    const active = req.body?.active === undefined ? old.active : req.body.active;
    if (typeof active !== 'boolean') throw new HttpError(422,'Invalid product availability.',{ active:'Use true or false.' });
    if (!active && old.active) assertCanArchive(db,old.id);
    db.prepare('UPDATE products SET name=?,description=?,category=?,sku=?,price=?,sale_price=?,stock=?,image=?,images=?,sizes=?,colors=?,is_new=?,featured=?,active=? WHERE id=?').run(...parameters(p),Number(active),old.id);
    res.json({ product:productFromRow(db.prepare('SELECT * FROM products WHERE id=?').get(old.id)) });
  });
  router.delete('/products/:id',(req,res) => {
    const product = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
    assert(product,404,'This product could not be found.');
    assert(req.body?.confirmation === product.sku,422,'Type the product SKU to confirm deletion.',{ confirmation:'The SKU does not match.' });
    assertCanArchive(db,product.id);
    db.prepare('UPDATE products SET active=0 WHERE id=?').run(product.id);
    res.json({ success:true });
  });
  router.get('/orders',(req,res) => {
    const page = Math.max(1,Math.min(100000,parseInt(req.query.page,10) || 1));
    const limit = 50;
    const total = db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?').all(limit,(page-1)*limit).map(row => orderFromRow(db,row));
    res.json({ orders,total,page,pages:Math.max(1,Math.ceil(total/limit)),transitions });
  });
  router.get('/orders/:id',(req,res) => {
    const order = orderFromRow(db,db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id));
    assert(order,404,'This order could not be found.'); res.json({ order });
  });
  router.patch('/orders/:id',(req,res) => res.json({ order:updateOrderStatus(db,req.params.id,req.body?.status) }));
  return router;
}
function assertCanArchive(db,id) {
  const activeOrder = db.prepare("SELECT 1 FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.product_id=? AND o.status NOT IN ('delivered','cancelled') LIMIT 1").get(id);
  assert(!activeOrder,409,'This product belongs to an active order. Complete or cancel those orders before deleting it.');
}
