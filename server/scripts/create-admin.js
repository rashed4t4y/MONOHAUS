import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { openDatabase } from '../db.js';
import { hashPassword } from '../lib/passwords.js';
import { validEmail } from '../lib/validation.js';
async function hiddenPassword(label) {
  if (!stdin.isTTY) throw new Error('Use an interactive terminal, or pass --stdin-json with JSON via standard input.');
  stdout.write(label); stdin.setRawMode(true); stdin.resume(); stdin.setEncoding('utf8');
  return new Promise((resolve,reject) => {
    let result = '';
    const finish = () => { stdin.off('data',read); stdin.setRawMode(false); stdin.pause(); stdout.write('\n'); };
    function read(chunk) {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') { finish(); resolve(result); return; }
        if (character === '\u0003') { finish(); reject(new Error('Cancelled.')); return; }
        if (character === '\u007f' || character === '\b') result = result.slice(0,-1);
        else if (character >= ' ') result += character;
      }
    }
    stdin.on('data',read);
  });
}
async function main() {
  let details;
  if (process.argv.includes('--stdin-json')) {
    let raw = ''; for await (const chunk of stdin) { raw += chunk; if (raw.length > 10000) throw new Error('Input too large.'); }
    details = JSON.parse(raw);
  } else {
    const rl = createInterface({ input:stdin,output:stdout });
    const name = await rl.question('Administrator name: '); const email = await rl.question('Administrator email: '); rl.close();
    const password = await hiddenPassword('Password (at least 12 characters, hidden): ');
    const confirmation = await hiddenPassword('Repeat password (hidden): ');
    if (password !== confirmation) throw new Error('Passwords do not match.');
    details = {name,email,password};
  }
  const name = String(details.name || '').trim(); const email = String(details.email || '').trim().toLowerCase(); const password = details.password;
  if (name.length < 2 || name.length > 100 || !validEmail(email) || typeof password !== 'string' || password.length < 12 || password.length > 128) throw new Error('Use a name of 2–100 characters, a valid email, and a password of 12–128 characters.');
  const db = openDatabase();
  try {
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw new Error('This email is already registered. Choose a separate administrator email.');
    db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')").run(name,email,await hashPassword(password));
    console.log('Administrator created. Sign in using the storefront Account link.');
  } finally { db.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
