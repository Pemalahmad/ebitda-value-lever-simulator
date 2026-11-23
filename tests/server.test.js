import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from '../server/index.js';

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((ok) => server.listen(0, ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('GET /api/health and /api/sectors', async () => {
  assert.equal((await (await fetch(`${base}/api/health`)).json()).ok, true);
  const sectors = await (await fetch(`${base}/api/sectors`)).json();
  assert.equal(sectors.length, 6);
  assert.ok(sectors[0].levers.length > 0);
  assert.equal(typeof sectors[0].compute, 'undefined');
});

test('POST /api/simulate returns the comparison, scorecard and game state', async () => {
  const r = await post('/api/simulate', { sector: 'urbanServices', levers: { utilisation: 75 } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.result.dEbitda > 0);
  assert.equal(j.levers.utilisation, 75);
  assert.equal(j.scorecard.perspectives.length, 4);
  assert.ok(j.game.confidence >= 0 && j.game.confidence <= 100);
});

test('POST /api/sensitivity and /api/memo', async () => {
  const s = await (await post('/api/sensitivity', { sector: 'retail', levers: {} })).json();
  assert.ok(s.tornado.length > 0);
  const m = await post('/api/memo', { sector: 'hospitality', levers: { occupancy: 80 } });
  assert.match(m.headers.get('content-type'), /markdown/);
  assert.match(await m.text(), /## 1\. Recommendation/);
});

test('bad input is rejected with 400, unknown routes 404, wrong verbs 405', async () => {
  assert.equal((await post('/api/simulate', { sector: 'nope' })).status, 400);
  assert.equal((await post('/api/simulate', { sector: 'retail', levers: { occupancy: 'x' } })).status, 400);
  const bad = await fetch(`${base}/api/simulate`, { method: 'POST', body: '{not json' });
  assert.equal(bad.status, 400);
  assert.equal((await post('/api/unknown', {})).status, 404);
  assert.equal((await fetch(`${base}/api/simulate`)).status, 405);
});

test('static serving cannot escape the dist folder', async () => {
  const r = await fetch(`${base}/..%2f..%2fpackage.json`);
  const text = await r.text();
  assert.ok(!text.includes('"devDependencies"'));
});

test('CLI writes a memo and a summary', () => {
  const memo = execFileSync('node', ['bin/value-memo.js', '--sector', 'leisure', '--set', 'cac=24,retention=66'], { encoding: 'utf8' });
  assert.match(memo, /Board Memo/);
  const summary = execFileSync('node', ['bin/value-memo.js', '--sector', 'retail', '--scenario', 'Cost & recovery', '--summary'], { encoding: 'utf8' });
  assert.match(summary, /Retail & Asset Management: EBITDA/);
  assert.throws(() => execFileSync('node', ['bin/value-memo.js', '--sector', 'retail', '--set', 'bogus=1'], { stdio: 'pipe' }));
});
