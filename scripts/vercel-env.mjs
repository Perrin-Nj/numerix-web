// Keeps Vercel environment variables in sync with the files in config/env (committed, no secrets).
//   node scripts/vercel-env.mjs diff <production|preview|development>
//   node scripts/vercel-env.mjs push <production|preview|development>
// Needs the Vercel CLI logged in and the project linked (vercel link). Secrets never go in these files.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const [, , command, environment] = process.argv;
const root = fileURLToPath(new URL('..', import.meta.url));
if (!['diff', 'push'].includes(command) || !['production', 'preview', 'development'].includes(environment)) {
  console.error('Usage: node scripts/vercel-env.mjs <diff|push> <production|preview|development>');
  process.exit(2);
}

function parse(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return out;
}

const wantedFile = join(root, 'config', 'env', `${environment}.env`);
if (!existsSync(wantedFile)) {
  console.error(`Missing ${wantedFile}`);
  process.exit(2);
}
const wanted = parse(wantedFile);
const known = Object.keys(parse(join(root, '.env.example')));
const unknown = Object.keys(wanted).filter((k) => !known.includes(k));
if (unknown.length) {
  console.error(`Variables not documented in .env.example: ${unknown.join(', ')}`);
  process.exit(1);
}

const vercel = (args, input) =>
  spawnSync('npx', ['vercel', ...args], { cwd: root, encoding: 'utf8', input, shell: process.platform === 'win32' });

if (command === 'push') {
  for (const [key, value] of Object.entries(wanted)) {
    // --force does not overwrite variables Vercel stored as sensitive, so remove first; these are config, not secrets
    vercel(['env', 'rm', key, environment, '--yes']);
    const r = vercel(['env', 'add', key, environment, '--no-sensitive', '--yes'], value);
    console.log(r.status === 0 ? `set  ${key}` : `FAIL ${key}: ${(r.stderr || r.stdout).split('\n')[0]}`);
  }
} else {
  const tmp = join(root, '.vercel-env-pull.tmp');
  const r = vercel(['env', 'pull', tmp, `--environment=${environment}`, '--yes']);
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  const remote = parse(tmp);
  const keys = new Set([...Object.keys(wanted), ...Object.keys(remote).filter((k) => known.includes(k))]);
  let drift = 0;
  for (const k of keys) {
    const problem = !(k in remote) ? 'missing on Vercel' : !(k in wanted) ? 'only on Vercel   ' : remote[k] !== wanted[k] ? 'different        ' : null;
    if (problem) {
      console.log(`${problem}: ${k}`);
      drift++;
    }
  }
  console.log(drift ? `${drift} difference(s)` : 'in sync');
  process.exit(drift ? 1 : 0);
}
