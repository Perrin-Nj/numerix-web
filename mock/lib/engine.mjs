// A small WireMock-compatible engine: it serves the SAME mappings that WireMock serves locally
// (contracts/wiremock/mappings), so the mock behaves identically on Vercel and in Docker.
// Supported subset: method, urlPath, urlPathPattern, queryParameters.equalTo, headers.equalTo,
// bodyPatterns.matchesJsonPath, priority, scenarios, jsonBody/body with Handlebars templates,
// fixedDelayMilliseconds, chunkedDribbleDelay, fault.
//
// Scenario state must survive across serverless invocations, so it travels with the client: the
// caller sends `x-mock-state` and gets the new value back in the same response header. Without the
// header the engine falls back to in-memory state (fine for a single local process).
import Handlebars from 'handlebars';
import { JSONPath } from 'jsonpath-plus';
import mappings from './mappings.mjs';
import { domain, seed } from './domain.mjs';

const hb = Handlebars.create();
hb.registerHelper('contains', (value, needle) => typeof value === 'string' && typeof needle === 'string' && value.includes(needle));
hb.registerHelper('jsonPath', (text, path) => {
  try {
    const json = typeof text === 'string' ? JSON.parse(text) : text;
    const found = JSONPath({ path, json, wrap: true });
    const v = found[0];
    return v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  } catch {
    return '';
  }
});

const ordered = mappings
  .map((m, index) => ({ m, index }))
  .sort((a, b) => (a.m.priority ?? 5) - (b.m.priority ?? 5) || b.index - a.index) // later file wins ties, as in WireMock
  .map((x) => x.m);

let memoryState = { s: {}, d: seed() };

export function encodeState(state) {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}
export function decodeState(value) {
  try {
    return value ? JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) : null;
  } catch {
    return null;
  }
}
export function resetMemoryState() {
  memoryState = { s: {}, d: seed() };
}

function headerMatches(req, wanted) {
  return Object.entries(wanted).every(([name, rule]) => {
    const got = req.headers[name.toLowerCase()];
    return rule.equalTo !== undefined ? got === rule.equalTo : true;
  });
}

function bodyMatches(req, patterns) {
  return patterns.every((p) => {
    const expr = typeof p.matchesJsonPath === 'string' ? p.matchesJsonPath : p.matchesJsonPath?.expression;
    if (!expr) return false;
    try {
      const json = JSON.parse(req.body || 'null');
      if (json === null) return false;
      // Jayway (WireMock) applies a root filter like $[?(@.a == 1)] to the document itself; JSONPath-Plus applies it to the children, so wrap the root
      const target = expr.startsWith('$[?') ? [json] : json;
      return JSONPath({ path: expr, json: target, wrap: true }).length > 0;
    } catch {
      return false;
    }
  });
}

function matches(m, req, state) {
  const r = m.request ?? {};
  if (r.method && r.method !== req.method) return false;
  if (r.urlPath !== undefined && r.urlPath !== req.path) return false;
  if (r.urlPathPattern !== undefined && !new RegExp(`^(?:${r.urlPathPattern})$`).test(req.path)) return false;
  if (r.queryParameters) {
    for (const [k, rule] of Object.entries(r.queryParameters)) {
      if (rule.equalTo !== undefined && !(req.query[k] ?? []).includes(rule.equalTo)) return false;
    }
  }
  if (r.headers && !headerMatches(req, r.headers)) return false;
  if (r.bodyPatterns && !bodyMatches(req, r.bodyPatterns)) return false;
  if (m.scenarioName && m.requiredScenarioState) {
    if ((state[m.scenarioName] ?? 'Started') !== m.requiredScenarioState) return false;
  }
  return true;
}

function renderDeep(value, ctx) {
  if (typeof value === 'string') return value.includes('{{') ? hb.compile(value, { noEscape: true })(ctx) : value;
  if (Array.isArray(value)) return value.map((v) => renderDeep(v, ctx));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renderDeep(v, ctx)]));
  return value;
}

/** req: { method, url, headers (lower-case keys), body } -> a plan the HTTP adapter plays back. */
export function handle(req) {
  const url = new URL(req.url, 'http://mock.local');
  const query = {};
  for (const [k, v] of url.searchParams) (query[k] ??= []).push(v);
  const r = { method: req.method.toUpperCase(), path: url.pathname, query, headers: req.headers, body: req.body ?? '' };

  if (r.path === '/__admin/health') return { status: 200, headers: { 'content-type': 'application/json' }, chunks: [JSON.stringify({ status: 'healthy' })], delays: [0], state: null };
  if (r.path === '/__admin/scenarios/reset' && r.method === 'POST') {
    resetMemoryState();
    return { status: 200, headers: {}, chunks: [''], delays: [0], state: memoryState };
  }

  const headerState = decodeState(req.headers['x-mock-state']);
  const current = headerState && headerState.s && headerState.d ? headerState : memoryState;
  const state = { ...current.s };

  // 1) injected failures (priority 1 + X-Mock-Scenario) win everywhere, 2) stateful domain, 3) the other mappings
  let hit = ordered.find((m) => (m.priority ?? 5) === 1 && matches(m, r, state));
  if (!hit) {
    const handled = domain(r, current.d);
    if (handled) {
      const out = { s: state, d: handled.d };
      if (!headerState) memoryState = out;
      return { ...handled.plan, state: out };
    }
    hit = ordered.find((m) => matches(m, r, state));
  }
  if (!hit) {
    return { status: 404, headers: { 'content-type': 'application/json' }, chunks: [JSON.stringify({ error: `No mapping for ${r.method} ${r.path}` })], delays: [0], state: null };
  }

  if (hit.scenarioName && hit.newScenarioState) state[hit.scenarioName] = hit.newScenarioState;
  const nextState = { s: state, d: current.d };
  if (!headerState) memoryState = nextState;

  const res = hit.response ?? {};
  if (res.fault) return { fault: res.fault, state: nextState };

  const ctx = {
    request: {
      method: r.method,
      url: req.url,
      body: r.body,
      query: Object.fromEntries(Object.entries(query).map(([k, v]) => [k, v.length === 1 ? v[0] : v])),
      headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, [v]])),
    },
  };
  // WireMock exposes header names in their original case; expose the common one explicitly
  ctx.request.headers['Accept-Language'] = ctx.request.headers['accept-language'] ?? [];

  const text = res.jsonBody !== undefined ? JSON.stringify(renderDeep(res.jsonBody, ctx)) : renderDeep(res.body ?? '', ctx);
  const headers = { ...(res.headers ?? {}) };
  const drib = res.chunkedDribbleDelay;
  let chunks = [text];
  let delays = [res.fixedDelayMilliseconds ?? 0];
  if (drib && text.length > 0) {
    const n = Math.max(1, drib.numberOfChunks);
    const size = Math.ceil(text.length / n);
    chunks = Array.from({ length: n }, (_, i) => text.slice(i * size, (i + 1) * size)).filter(Boolean);
    delays = chunks.map((_, i) => (i === 0 ? res.fixedDelayMilliseconds ?? 0 : drib.totalDuration / n));
  }
  return { status: res.status ?? 200, headers, chunks, delays, state: nextState, streamed: Boolean(drib) };
}
