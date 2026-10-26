import { Router } from 'express';
import { productFromRow } from '../db.js';
import { assert } from '../lib/errors.js';
import { text, CATEGORIES } from '../lib/validation.js';
export function listProducts(db,query,admin = false) {
  const clauses = [admin ? '1=1' : 'active=1']; const params = [];
  const search = text(query.search).slice(0,100);
  if (search) { clauses.push("(name LIKE ? ESCAPE '!' OR description LIKE ? ESCAPE '!' OR sku LIKE ? ESCAPE '!')"); const pattern = `%${search.replace(/[!%_]/g, '!$&')}%`; params.push(pattern,pattern,pattern); }
  const category = text(query.category);
  if (category && category.toLowerCase() !== 'all') { clauses.push('category = ? COLLATE NOCASE'); params.push(category); }
  if (query.new === 'true') clauses.push('is_new=1');
  if (query.featured === 'true') clauses.push('featured=1');
  const sorts = { newest:'created_at DESC,id DESC', 'price-asc':'COALESCE(sale_price,price) ASC,id DESC', 'price-desc':'COALESCE(sale_price,price) DESC,id DESC' };
  const sort = sorts[query.sort] || sorts.newest;
  const page = Math.max(1,Math.min(100000,parseInt(query.page,10) || 1));
  const limit = Math.max(1,Math.min(48,parseInt(query.limit,10) || (admin ? 48 : 12)));
  const where = clauses.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE ${where}`).get(...params).count;
  const products = db.prepare(`SELECT * FROM products WHERE ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`).all(...params,limit,(page-1)*limit).map(productFromRow);
  return { products,total,page,pages:Math.max(1,Math.ceil(total/limit)),categories:CATEGORIES };
}
export function productRoutes(db) {
  const router = Router();
  router.get('/',(req,res) => res.json(listProducts(db,req.query)));
  router.get('/:id',(req,res) => {
    assert(/^\d+$/.test(req.params.id),404,'This product could not be found.');
    const product = productFromRow(db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(req.params.id));
    assert(product,404,'This product could not be found.');
    const related = db.prepare('SELECT * FROM products WHERE active=1 AND category=? AND id<>? ORDER BY featured DESC,id DESC LIMIT 4').all(product.category,product.id).map(productFromRow);
    res.json({ product,related });
  });
  return router;
}
