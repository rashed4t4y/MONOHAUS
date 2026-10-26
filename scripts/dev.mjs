import { spawn } from 'node:child_process';
import { createServer } from 'vite';
const backend = spawn(process.execPath, ['--watch', '--env-file-if-exists=.env', 'server/index.js'], { stdio: 'inherit' });
const vite = await createServer({ configFile: 'client/vite.config.js' });
await vite.listen();
vite.printUrls();
let closing = false;
async function stop(code = 0) {
  if (closing) return;
  closing = true;
  backend.kill();
  await vite.close();
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
backend.on('exit', code => { if (!closing) stop(code ?? 1); });
