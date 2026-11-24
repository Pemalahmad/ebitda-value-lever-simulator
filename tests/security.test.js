// Security tests: API hardening, static-file confinement, injection-safe rendering, feed sanitising,
// the build's Content-Security-Policy and the CI supply-chain settings.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer, SECURITY_HEADERS } from '../server/index.js';
import { renderMarkdown } from '../src/engine/markdown.js';
import { parseFeed } from '../src/engine/pulse.js';
import { CSP } from '../vite.config.js';

let server, base, port;
before(async () => { server = createServer(); await new Promise((ok) => server.listen(0, ok)); port = server.address().port; base = `http://127.0.0.1:${port}`; });
after(() => server.close());

// Raw request, so path tricks reach the server unchanged.
const raw = (path) => new Promise((ok) => {
  const c = connect(port, '127.0.0.1', () => c.write(`GET ${path} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
  let d = ''; c.on('data', (x) => { d += x; }); c.on('end', () => ok(d));
});

test('every response carries the security headers', async () => {
  for (const path of ['/api/health', '/', '/api/nope']) {
    const r = await fetch(base + path);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) assert.equal(r.headers.get(k), v, `${path} ${k}`);
    assert.equal(r.headers.get('access-control-allow-origin'), null, 'no CORS');
  }
});

test('static serving never leaks files outside dist', async () => {
  const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  for (const p of ['/../package.json', '/..%2fpackage.json', '/%2e%2e/%2e%2e/etc/passwd', '/....//package.json', '/%2e%2e%2fserver%2findex.js', '/..\\package.json', '/%5c..%5cpackage.json']) {
    const body = await raw(p);
    assert.ok(!body.includes('"devDependencies"') && !body.includes(pkg.slice(0, 40)) && !body.includes('root:x:'), p);
    assert.ok(!body.includes('createServer'), `${p} leaked server source`);
  }
});

test('malformed URLs and NUL bytes are rejected with 400, not 500', async () => {
  assert.match(await raw('/%E0%A4%A'), /^HTTP\/1\.1 400/);
  assert.match(await raw('/index.html%00.png'), /^HTTP\/1\.1 400/);
});

test('oversized bodies get a 413 reply', async () => {
  const r = await fetch(`${base}/api/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pad: 'x'.repeat(70_000) }) });
  assert.equal(r.status, 413);
});

test('API input is validated: bad JSON, wrong verbs, unknown sectors, non-numbers', async () => {
  const post = (body) => fetch(`${base}/api/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.equal((await post('{nope')).status, 400);
  assert.equal((await fetch(`${base}/api/simulate`)).status, 405);
  assert.equal((await post(JSON.stringify({ sector: '<script>' }))).status, 400);
  assert.equal((await post(JSON.stringify({ sector: 'hospitality', levers: { occupancy: 'x' } }))).status, 400);
  const big = await (await post(JSON.stringify({ sector: 'hospitality', levers: { occupancy: 1e300 } }))).json();
  assert.ok(big.levers.occupancy <= 100, 'out-of-range levers are clamped');
  const err = await (await post(JSON.stringify({ sector: 'x'.repeat(5000) }))).json();
  assert.ok(err.error.length <= 200, 'error bodies are capped');
  assert.ok(!/\bat \w+ \(/.test(err.error), 'no stack traces');
});

test('prototype pollution through levers is ignored', async () => {
  await fetch(`${base}/api/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"sector":"hospitality","levers":{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":1}}}}' });
  assert.equal({}.polluted, undefined);
});

test('the memo renderer escapes HTML and script', () => {
  const html = renderMarkdown('# <img src=x onerror=alert(1)>\n\n**<script>alert(1)</script>**\n\n| a | b |\n|---|---|\n| <iframe> | `<b>` |');
  assert.ok(!/<(script|img|iframe)\b/i.test(html), 'no live tags');
  assert.ok(!/<[^>]*\bon\w+=/i.test(html), 'no event handlers inside a tag');
  assert.match(html, /&lt;script&gt;/);
});

test('news links must be http(s): javascript and data URLs are dropped', () => {
  const xml = `<rss><channel>
    <item><title>Evil</title><link>javascript:alert(1)</link><pubDate>Mon, 23 Nov 2026 08:00:00 GMT</pubDate></item>
    <item><title>Data</title><link>data:text/html,hi</link></item>
    <item><title>Fine</title><link>https://example.com/a</link></item></channel></rss>`;
  assert.deepEqual(parseFeed(xml).map((x) => x.link), ['https://example.com/a']);
  const snapshot = JSON.parse(readFileSync(new URL('../data/pulse/pulse.json', import.meta.url)));
  assert.ok(snapshot.news.every((n) => /^https?:\/\//.test(n.link)), 'committed snapshot has only http(s) links');
});

test('the build carries a strict Content-Security-Policy', () => {
  assert.match(CSP, /default-src 'self'/);
  assert.match(CSP, /script-src 'self'(;|$)/);
  assert.doesNotMatch(CSP, /unsafe-eval/);
  assert.match(CSP, /object-src 'none'/);
  assert.match(CSP, /form-action 'none'/);
});

test('no inline event handlers or javascript: URLs in the UI source', () => {
  const dir = new URL('../src/ui/components/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(src, /href=["']javascript:/i, f);
    assert.doesNotMatch(src, /\beval\(|new Function\(/, f);
    const raw = (src.match(/dangerouslySetInnerHTML/g) ?? []).length;
    assert.ok(raw === 0 || (f === 'ValuePlanView.jsx' && raw === 1 && /renderMarkdown\(md\)/.test(src)), `${f}: raw HTML only through the escaping memo renderer`);
    assert.doesNotMatch(src, /target="_blank"(?![^>]*rel="noreferrer")/, `${f}: external links need rel="noreferrer"`);
  }
});

test('CI pins actions to commit SHAs, audits dependencies and runs read-only', () => {
  const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  for (const line of ci.split('\n').filter((l) => /uses:/.test(l))) assert.match(line, /@[0-9a-f]{40}\b/, line.trim());
  assert.match(ci, /npm audit --audit-level=high/);
  assert.match(ci, /^permissions:\n\s+contents: read/m);
  assert.match(ci, /persist-credentials: false/);
});

test('third-party React Bits components keep their licence notice', () => {
  const dir = new URL('../src/ui/vendor/reactbits/', import.meta.url);
  assert.match(readFileSync(new URL('LICENSE.md', dir), 'utf8'), /Commons Clause/);
  for (const f of readdirSync(dir).filter((x) => /\.(jsx|css)$/.test(x))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.match(src.split('\n')[0], /From React Bits .*David Haz/, `${f} header`);
    assert.doesNotMatch(src, /\bfetch\(|\beval\(|new Function\(|dangerouslySetInnerHTML|innerHTML/, `${f} has no network or raw-HTML code`);
  }
});
