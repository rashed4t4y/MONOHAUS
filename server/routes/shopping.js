import { Router } from 'express';
import { requireAuth } from '../lib/security.js';
import { orderFromRow } from '../db.js';
import { createOrder, quote } from '../services/orders.js';
import { assert } from '../lib/errors.js';
export function shoppingRoutes(db) {
  const router = Router();
  router.use(requireAuth);
  router.get('/account',(req,res) => {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100').all(req.user.id).map(row => orderFromRow(db,row));
    res.json({ user:req.user,orders });
  });
  router.post('/checkout/quote',(req,res) => res.json(quote(db,req.body?.items)));
  router.post('/checkout',(req,res) => {
    const { order,replayed } = createOrder(db,req.user,req.body);
    res.status(replayed ? 200 : 201).json({ order,replayed });
  });
  router.get('/orders/:id',(req,res) => {
    const row = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.id,req.user.id);
    assert(row,404,'This order could not be found.'); res.json({ order:orderFromRow(db,row) });
  });
  return router;
}
