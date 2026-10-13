// pnpm dev: starts the mock backend (if nothing answers on :8081) and the Next.js dev server together,
// so "Le problème vient de nous" never means a forgotten second terminal.
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';

const MOCK_PORT = 8081;
const children = [];

const inUse = (port) =>
  new Promise((resolve) => {
    const s = createConnection({ port, host: '127.0.0.1' }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
  });

const run = (cmd, args, name) => {
  const c = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  c.on('exit', (code) => {
    console.log(`[dev] ${name} stopped (${code})`);
    shutdown(code ?? 0);
  });
  children.push(c);
};

function shutdown(code = 0) {
  for (const c of children) if (!c.killed) c.kill();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (await inUse(MOCK_PORT)) console.log(`[dev] mock already running on :${MOCK_PORT}, reusing it`);
else {
  console.log(`[dev] starting the mock backend on :${MOCK_PORT}`);
  run('node', ['mock/dev.mjs', String(MOCK_PORT)], 'mock');
  await new Promise((r) => setTimeout(r, 800));
}
run('pnpm', ['exec', 'next', 'dev'], 'next');
