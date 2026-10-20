// Fetches the chosen Kevin MacLeod tracks (CC BY 4.0), cuts a seamless loop of each and writes
// public/music/*.webm plus credits.json. Pinned ffmpeg: ffmpeg-static 5.3.0 from numerix-api/tools/voice
// (or set FFMPEG). Run: node scripts/build-music.mjs   (needs network; output is committed)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'music');
const ff = process.env.FFMPEG ?? join(process.env.API_DIR ?? join(root, '..', '..', 'numerix-api'), 'tools', 'voice', 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
if (!existsSync(ff) && !process.env.FFMPEG) throw new Error('ffmpeg missing: npm i in numerix-api/tools/voice or set FFMPEG');
const BASE = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/';
const CAT = 'https://incompetech.com/music/royalty-free/pieces.json';
const LICENCE = 'CC BY 4.0';
const LICENCE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const TITLES = ['Morning', 'Avec Soin', 'Facile', 'Water Lily', 'Reawakening', 'Enchanted Journey', 'Clear Air'];
const START = 20; // seconds into the piece
const LEN = 72; // clip length
const XF = 4; // crossfade so the end melts into the start

const catalog = await (await fetch(CAT)).json();
mkdirSync(out, { recursive: true });
const credits = [];
for (const title of TITLES) {
  const p = catalog.find((t) => t.title === title);
  if (!p) throw new Error(`not in catalog: ${title}`);
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const src = join(tmpdir(), `${id}.mp3`);
  const res = await fetch(BASE + encodeURIComponent(p.filename));
  if (!res.ok) throw new Error(`${title}: HTTP ${res.status}`);
  writeFileSync(src, Buffer.from(await res.arrayBuffer()));
  // loop = body, then the tail cross-faded into the head: the last sample flows into the first
  const f = [
    `[0:a]atrim=${START}:${START + LEN},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,asplit=3[a][b][c]`,
    `[a]atrim=${XF}:${LEN - XF},asetpts=PTS-STARTPTS[body]`,
    `[b]atrim=${LEN - XF}:${LEN},asetpts=PTS-STARTPTS[tail]`,
    `[c]atrim=0:${XF},asetpts=PTS-STARTPTS[head]`,
    `[tail][head]acrossfade=d=${XF}[x]`,
    `[body][x]concat=n=2:v=0:a=1,loudnorm=I=-26:TP=-3:LRA=7[o]`,
  ].join(';');
  const dst = join(out, `${id}.webm`);
  const r = spawnSync(ff, ['-y', '-v', 'error', '-i', src, '-filter_complex', f, '-map', '[o]', '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', dst], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${title}: ffmpeg failed`);
  credits.push({
    id,
    file: `${id}.webm`,
    title: p.title,
    artist: 'Kevin MacLeod',
    licence: LICENCE,
    licence_url: LICENCE_URL,
    source_url: `https://incompetech.com/music/royalty-free/index.html?isrc=${p.isrc}`,
    bytes: statSync(dst).size,
  });
}
writeFileSync(join(out, 'credits.json'), JSON.stringify(credits, null, 2) + '\n');
console.log(credits.map((c) => `${c.id} ${c.bytes}`).join('\n'), '\ntotal', credits.reduce((a, c) => a + c.bytes, 0));
