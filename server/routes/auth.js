import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { text, validEmail } from '../lib/validation.js';
import { HttpError, assert } from '../lib/errors.js';
import { publicUser } from '../db.js';
import { newCsrf, regenerateSession, saveSession } from '../lib/security.js';
export function authRoutes(db, { authLimit = 15 } = {}) {
  const router = Router();
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, limit: authLimit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please try again in 15 minutes.' } });
  // A valid dummy hash makes unknown-account logins perform the same expensive operation.
  const dummyHash = hashPassword(randomBytes(32).toString('hex'));
  router.get('/session', async (req,res) => {
    req.session.csrfToken ||= newCsrf();
    await saveSession(req);
    res.json({ user: req.user, csrfToken: req.session.csrfToken });
  });
  async function signIn(req,user) {
    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.authenticatedAt = Date.now();
    req.session.csrfToken = newCsrf();
    await saveSession(req);
    return { user: publicUser(user), csrfToken: req.session.csrfToken };
  }
  router.post('/register', limit, async (req,res) => {
    const name = text(req.body?.name);
    const email = text(req.body?.email).toLowerCase();
    const password = req.body?.password;
    const fields = {};
    if (name.length < 2 || name.length > 100) fields.name = 'Enter a name between 2 and 100 characters.';
    if (!validEmail(email)) fields.email = 'Enter a valid email address.';
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) fields.password = 'Use a password between 12 and 128 characters.';
    if (Object.keys(fields).length) throw new HttpError(422,'Please check your account details.',fields);
    assert(!db.prepare('SELECT id FROM users WHERE email=?').get(email),409,'An account with this email already exists.',{ email: 'This email is already registered.' });
    const passwordHash = await hashPassword(password);
    let id;
    try { id = db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run(name,email,passwordHash).lastInsertRowid; }
    catch (error) { if (error.message.includes('UNIQUE')) throw new HttpError(409,'An account with this email already exists.',{ email: 'This email is already registered.' }); throw error; }
    res.status(201).json(await signIn(req,db.prepare('SELECT * FROM users WHERE id=?').get(id)));
  });
  router.post('/login', limit, async (req,res) => {
    const email = text(req.body?.email).toLowerCase(); const password = req.body?.password;
    assert(validEmail(email) && typeof password === 'string' && password.length >= 1 && password.length <= 128,422,'Enter a valid email and password.');
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    const verified = await verifyPassword(password, user?.password_hash || await dummyHash);
    assert(user && verified,401,'The email or password is incorrect.');
    res.json(await signIn(req,user));
  });
  router.post('/logout', async (req,res) => {
    await regenerateSession(req); req.session.csrfToken = newCsrf(); await saveSession(req);
    res.json({ user: null, csrfToken: req.session.csrfToken });
  });
  return router;
}
