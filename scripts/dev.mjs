// pnpm dev: starts the Go API (if nothing answers on :8081), seeds a demo account in development, then the
// Next.js dev server, so "Le problème vient de nous" never means a forgotten second terminal.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';

const API_PORT = 8081;
const API_DIR = process.env.API_DIR ?? resolve(import.meta.dirname, '../../numerix-api');
const GO_BIN = process.env.GO_BIN ?? 'C:\Program Files\Go\bin';
const EXE = resolve(API_DIR, process.platform === 'win32' ? 'bin/api.exe' : 'bin/api');
const children = [];

const inUse = (port) =>
  new Promise((res) => {
    const s = createConnection({ port, host: '127.0.0.1' }, () => {
      s.destroy();
      res(true);
    });
    s.on('error', () => res(false));
  });

const run = (cmd, args, name, opts = {}) => {
  const c = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
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

if (await inUse(API_PORT)) console.log(`[dev] Go API already running on :${API_PORT}, reusing it`);
else {
  if (!existsSync(EXE)) {
    console.log('[dev] building the Go API');
    const b = spawnSync('go', ['build', '-o', EXE, './cmd/api'], {
      cwd: API_DIR,
      stdio: 'inherit',
      env: { ...process.env, PATH: `${process.env.PATH}${process.platform === 'win32' ? ';' : ':'}${GO_BIN}` },
    });
    if (b.status !== 0) process.exit(b.status ?? 1);
  }
  console.log(`[dev] starting the Go API on :${API_PORT}`);
  run(EXE, [], 'api', {
    cwd: API_DIR,
    shell: false,
    env: { ...process.env, PORT: String(API_PORT), APP_ENV: 'development', DB_PATH: './data/dev.db', FEATURE_WELCOME_GIFT: 'true' },
  });
  for (let i = 0; i < 40 && !(await inUse(API_PORT)); i++) await new Promise((r) => setTimeout(r, 250));
  spawnSync('node', ['scripts/seed-dev.mjs'], { stdio: 'inherit' });
}
run('pnpm', ['exec', 'next', 'dev'], 'next');
