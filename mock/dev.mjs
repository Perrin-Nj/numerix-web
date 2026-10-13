// Local server for the Vercel mock: node mock/dev.mjs [port]  (default 8081)
import { createServer } from 'node:http';
import { encodeState, handle } from './lib/engine.mjs';

const port = Number(process.argv[2] ?? 8081);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

createServer(async (req, res) => {
  const parts = [];
  for await (const c of req) parts.push(c);
  const body = Buffer.concat(parts).toString('utf8');
  const plan = await handle({ method: req.method, url: req.url, headers: req.headers, body });
  if (plan.fault) return req.socket.destroy();
  res.statusCode = plan.status;
  for (const [k, v] of Object.entries(plan.headers)) res.setHeader(k, v);
  if (plan.state) res.setHeader('x-mock-state', encodeState(plan.state));
  for (let i = 0; i < plan.chunks.length; i++) {
    if (plan.delays[i]) await sleep(plan.delays[i]);
    res.write(plan.chunks[i]);
  }
  res.end();
}).listen(port, () => console.log(`mock on http://localhost:${port}`));
