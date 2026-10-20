// QA stack on private ports: API 8130, web 3130, scratch DB seeded with the full question bank + demo parent.
// Usage: node scripts/qa/stack.mjs [--no-build]   Leaves processes running; stop with: node scripts/qa/stack.mjs --stop
import { spawn, spawnSync, execSync } from 'node:child_process';
import { mkdirSync, copyFileSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const API_PORT = Number(process.env.QA_API_PORT ?? 8130), WEB_PORT = Number(process.env.QA_WEB_PORT ?? 3130);
const FE = resolve(import.meta.dirname, '../..');
const API_DIR = resolve(FE, '../numerix-api');
const OUT = resolve(import.meta.dirname, 'out');
const DB = process.env.QA_DB ?? resolve(OUT, `qa-${API_PORT}.db`);
const PIDS = resolve(OUT, `pids-${WEB_PORT}.json`);
const up = (u) => fetch(u, { signal: AbortSignal.timeout(2000) }).then((r) => r.status < 500, () => false);
mkdirSync(OUT, { recursive: true });

if (process.argv.includes('--stop')) {
  for (const pid of existsSync(PIDS) ? JSON.parse(readFileSync(PIDS, 'utf8')) : []) try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); } catch { /* already stopped */ }
  process.exit(0);
}
const env = { ...process.env, PATH: `${process.env.PATH};C:\\Program Files\\Go\\bin` };
const pids = [];
if (!(await up(`http://localhost:${API_PORT}/v1/health`))) {
  const exe = resolve(API_DIR, `bin/api-qa-${API_PORT}.exe`);
  const b = spawnSync('go', ['build', '-o', exe, './cmd/api'], { cwd: API_DIR, env, stdio: 'inherit' });
  if (b.status) process.exit(1);
  for (const s of ['', '-wal', '-shm']) rmSync(DB + s, { force: true });
  const api = spawn(exe, [], { cwd: API_DIR, detached: true, stdio: 'ignore', env: { ...env, PORT: String(API_PORT), APP_ENV: 'development', DB_PATH: DB, FEATURE_WELCOME_GIFT: 'true', TRUST_PROXY: 'true' } });
  api.unref(); pids.push(api.pid);
  for (let i = 0; i < 40 && !(await up(`http://localhost:${API_PORT}/v1/health`)); i++) await new Promise((r) => setTimeout(r, 500));
  const s = spawnSync('go', ['run', './cmd/seed', '--db', DB, '--exclude', '_examples'], { cwd: API_DIR, env, encoding: 'utf8' });
  console.log('seed:', (s.stdout + s.stderr).trim().split('\n').slice(-3).join(' | '));
  spawnSync('node', ['scripts/seed-dev.mjs', `http://localhost:${API_PORT}/v1`], { cwd: FE, stdio: 'inherit' });
}
if (!(await up(`http://localhost:${WEB_PORT}/api/health`))) {
  const wenv = { ...env, NEXT_PUBLIC_FEATURE_WELCOME_GIFT: 'true', NEXT_PUBLIC_FEATURE_SUBSCRIPTION_UI: 'true', API_URL: `http://localhost:${API_PORT}/v1`, NX_DIST: `.next-${WEB_PORT}` };
  if (!process.argv.includes('--no-build')) {
    const b = spawnSync('pnpm', ['exec', 'next', 'build'], { cwd: FE, env: wenv, shell: true, encoding: 'utf8' });
    if (b.status) { console.log((b.stdout + b.stderr).slice(-1500)); process.exit(1); }
  }
  const web = spawn('pnpm', ['exec', 'next', 'start', '-p', String(WEB_PORT)], { cwd: FE, env: wenv, shell: true, detached: true, stdio: 'ignore' });
  web.unref(); pids.push(web.pid);
  for (let i = 0; i < 60 && !(await up(`http://localhost:${WEB_PORT}/api/health`)); i++) await new Promise((r) => setTimeout(r, 1000));
}
writeFileSync(PIDS, JSON.stringify(pids));
console.log(`stack up: api :${API_PORT} web :${WEB_PORT} db ${DB}`, (await up(`http://localhost:${WEB_PORT}/api/health`)) ? 'OK' : 'WEB DOWN');
