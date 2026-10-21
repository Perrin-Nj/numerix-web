import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const keysFrom = (source, pattern) => [...source.matchAll(pattern)].map((match) => match[1]);
const check = async (file, keys) => {
  const example = await read(file);
  for (const key of new Set(keys)) {
    assert.match(example, new RegExp(`^${key}=`, 'm'), `${file} is missing ${key}`);
  }
};

const [publicConfig, serverConfig, adminConfig] = await Promise.all([
  read('src/config/env.ts'),
  read('src/config/server-env.ts'),
  read('admin/src/lib/env.ts'),
]);
const publicKeys = keysFrom(publicConfig, /process\.env\.([A-Z][A-Z0-9_]*)/g);
const serverKeys = keysFrom(serverConfig, /([A-Z][A-Z0-9_]+):\s*z\./g);
const adminKeys = keysFrom(adminConfig, /^\s{2}([A-Z][A-Z0-9_]+):/gm);

await check('.env.example', [...publicKeys, ...serverKeys]);
for (const environment of ['development', 'preview', 'production', 'staging']) {
  await check(`config/env/${environment}.env`, [...publicKeys, ...serverKeys]);
}
await check('admin/.env.example', adminKeys);
console.log('Environment examples cover all web and admin schema variables.');
