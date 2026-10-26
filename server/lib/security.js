import { randomBytes, timingSafeEqual } from 'node:crypto';
import { publicUser } from '../db.js';
import { HttpError } from './errors.js';
export const newCsrf = () => randomBytes(32).toString('hex');
export const saveSession = req => new Promise((resolve,reject) => req.session.save(error => error ? reject(error) : resolve()));
export const regenerateSession = req => new Promise((resolve,reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
export function sessionUser(db) {
  return (req,res,next) => {
    if (req.session.authenticatedAt && Date.now() - req.session.authenticatedAt > 7 * 24 * 60 * 60 * 1000) { delete req.session.userId; delete req.session.authenticatedAt; }
    req.user = req.session.userId ? publicUser(db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(req.session.userId)) : null;
    next();
  };
}
export function requireAuth(req,res,next) { if (!req.user) return next(new HttpError(401,'Sign in to continue.')); next(); }
export function requireAdmin(req,res,next) { if (!req.user) return next(new HttpError(401,'Sign in to continue.')); if (req.user.role !== 'admin') return next(new HttpError(403,'Administrator access is required.')); next(); }
export function csrfProtection({ production, origin }) {
  const allowed = new Set([origin, ...(!production ? ['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3001','http://127.0.0.1:3001'] : [])].filter(Boolean));
  return (req,res,next) => {
    if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
    const requestOrigin = req.get('origin');
    if (requestOrigin && !allowed.has(requestOrigin)) return next(new HttpError(403,'This request came from an untrusted origin.'));
    const sent = req.get('x-csrf-token') || '';
    const expected = req.session.csrfToken || '';
    if (!/^[a-f0-9]{64}$/.test(sent) || !expected || sent.length !== expected.length || !timingSafeEqual(Buffer.from(sent),Buffer.from(expected))) return next(new HttpError(403,'Your session has changed. Refresh and try again.'));
    next();
  };
}


