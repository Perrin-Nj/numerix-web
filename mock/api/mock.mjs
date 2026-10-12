import { encodeState, handle } from '../lib/engine.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readBody(req) {
  const parts = [];
  for await (const c of req) parts.push(c);
  return Buffer.concat(parts).toString('utf8');
}

/** Vercel Node function: every path is rewritten here with the original path in ?__p= (see vercel.json). */
export default async function handler(req, res) {
  const original = new URL(req.url, 'http://mock.local');
  const path = '/' + (original.searchParams.get('__p') ?? '');
  original.searchParams.delete('__p');
  const url = path + (original.searchParams.size ? `?${original.searchParams}` : '');

  const body = req.method === 'GET' || req.method === 'HEAD' ? '' : await readBody(req);
  const plan = handle({ method: req.method, url, headers: req.headers, body });

  if (plan.fault) {
    req.socket.destroy();
    return;
  }
  res.statusCode = plan.status;
  for (const [k, v] of Object.entries(plan.headers)) res.setHeader(k, v);
  if (plan.state) {
    res.setHeader('x-mock-state', encodeState(plan.state));
    res.setHeader('access-control-expose-headers', 'x-mock-state');
  }
  if (plan.streamed) res.setHeader('x-accel-buffering', 'no');
  for (let i = 0; i < plan.chunks.length; i++) {
    if (plan.delays[i]) await sleep(plan.delays[i]);
    res.write(plan.chunks[i]);
  }
  res.end();
}
