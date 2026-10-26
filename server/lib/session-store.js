import session from 'express-session';
export class SQLiteSessionStore extends session.Store {
  constructor(db) {
    super(); this.db = db;
    this.sweep = setInterval(() => {
      try { this.db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now()); }
      catch (error) { this.emit('error', error); }
    }, 600000).unref();
  }
  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT sess,expires FROM sessions WHERE sid=?').get(sid);
      if (!row || row.expires <= Date.now()) return callback(null, null);
      callback(null, JSON.parse(row.sess));
    } catch (error) { callback(error); }
  }
  set(sid, value, callback = () => {}) {
    try {
      const expiry = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + 86400000;
      this.db.prepare('INSERT INTO sessions(sid,sess,expires) VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess,expires=excluded.expires').run(sid, JSON.stringify(value), expiry);
      callback();
    } catch (error) { callback(error); }
  }
  destroy(sid, callback = () => {}) {
    try { this.db.prepare('DELETE FROM sessions WHERE sid=?').run(sid); callback(); }
    catch (error) { callback(error); }
  }
  touch(sid, value, callback = () => {}) {
    try { this.db.prepare('UPDATE sessions SET expires=? WHERE sid=?').run(new Date(value.cookie.expires).getTime(),sid); callback(); }
    catch (error) { callback(error); }
  }
  close() { clearInterval(this.sweep); }
}
