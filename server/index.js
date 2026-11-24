#!/usr/bin/env node
// Zero-dependency Node server: serves the built dashboard and exposes the
// engine as a JSON API so other tools (BI, PMO trackers, agents) can call it.
//
//   GET  /api/health
//   GET  /api/sectors                      -> sectors with levers and scenarios
//   POST /api/simulate  {sector, levers}   -> comparison, scorecard, business case, game state
//   POST /api/sensitivity {sector, levers} -> bridge, tornado, leverage
//   POST /api/memo      {sector, levers}   -> board memo (text/markdown)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTORS, getSector, evaluate, bridge, tornado, leverage, buildMemo, sanitize } from '../src/engine/index.js';

const ROOT = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const MAX_BODY = 64 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

// Sent on every response: no MIME sniffing, no framing, no referrer leakage, and a strict CSP
// (the same policy the static build carries in its meta tag).
export const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
};

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body, (_, v) => (v === Infinity ? 'Infinity' : Number.isNaN(v) ? null : v)));
};

function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { req.removeAllListeners('data'); req.pause(); fail(Object.assign(new Error('Body too large'), { status: 413, close: true })); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { fail(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', fail);
  });
}

function scenarioFrom(body) {
  const sector = getSector(String(body.sector ?? ''));
  const levers = sanitize(sector, body.levers && typeof body.levers === 'object' ? body.levers : {});
  return { sector, levers };
}

const publicSector = (s) => ({ id: s.id, name: s.name, tagline: s.tagline, company: s.company, scale: s.scale, valuation: s.valuation, wacc: s.wacc, budget: s.budget, levers: s.levers, scenarios: s.scenarios, missions: s.missions.map(({ id, title, desc, xp }) => ({ id, title, desc, xp })) });

async function api(req, res, path) {
  if (req.method === 'GET' && path === '/api/health') return json(res, 200, { ok: true, sectors: SECTORS.length });
  if (req.method === 'GET' && path === '/api/sectors') return json(res, 200, SECTORS.map(publicSector));
  if (!['/api/simulate', '/api/sensitivity', '/api/memo'].includes(path)) return json(res, 404, { error: 'Not found' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { sector, levers } = scenarioFrom(await readBody(req));
  if (path === '/api/simulate') {
    const e = evaluate(sector, levers);
    const strip = ({ lines, kpis, flags, ebitda, revenue, margin, ev, wc }) => ({ revenue, ebitda, margin, ev, wc, lines, kpis, flags });
    return json(res, 200, {
      sector: sector.id,
      levers,
      result: { ...e.cmp, base: strip(e.cmp.base), scn: strip(e.cmp.scn) },
      scorecard: e.sc,
      businessCase: e.bc,
      game: { confidence: e.confidence, score: e.score, rank: e.rank.name, missions: e.missions },
    });
  }
  if (path === '/api/sensitivity') return json(res, 200, { bridge: bridge(sector, levers), tornado: tornado(sector, levers), leverage: leverage(sector, levers) });
  if (path === '/api/memo') {
    res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
    return res.end(buildMemo(sector, levers));
  }
}

async function staticFile(res, path) {
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { return json(res, 400, { error: 'Bad request' }); }
  if (decoded.includes('\0')) return json(res, 400, { error: 'Bad request' });
  const rel = normalize(decoded).replace(/^([/\\])+/, '');
  let file = join(ROOT, rel || 'index.html');
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return json(res, 403, { error: 'Forbidden' });
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(body);
    } catch {
      res.writeHead(503, { 'content-type': 'text/plain' });
      res.end('Dashboard not built yet. Run `npm run build`, or use `npm run dev`.');
    }
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    let pathname;
    try { ({ pathname } = new URL(req.url, 'http://localhost')); } catch { return json(res, 400, { error: 'Bad request' }); }
    try {
      if (pathname.startsWith('/api/')) return await api(req, res, pathname);
      return await staticFile(res, pathname);
    } catch (err) {
      const status = err.status ?? (/Unknown sector|must be a number/.test(err.message) ? 400 : 500);
      if (err.close) res.setHeader('connection', 'close');
      // Never return stack traces; cap echoed input so error bodies stay small.
      return json(res, status, { error: status === 500 ? 'Internal error' : String(err.message).slice(0, 200) });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8787;
  createServer().listen(port, () => console.log(`Value Lever Simulator on http://localhost:${port}  (API at /api/sectors)`));
}
