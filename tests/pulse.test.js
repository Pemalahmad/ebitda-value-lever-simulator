import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFeed, decode, classify, stats, signals, byTheme, byCountry, noteErrors, reviewDue, snapshotLevels } from '../src/engine/pulse.js';

const NOW = Date.parse('2026-11-23T12:00:00Z');
const day = (n) => new Date(NOW - n * 864e5).toISOString().slice(0, 10);
const series = (start, end, n = 70) => Array.from({ length: n }, (_, i) => [day(n - 1 - i), start + ((end - start) * i) / (n - 1)]);
const market = (id, s, extra = {}) => ({ id, label: id, group: 'x', interval: '1d', series: s, ...extra });
const news = (title, hoursAgo = 2) => ({ title, link: 'https://example.com/a', source: 'Gulf News', feed: 'Gulf News', published: new Date(NOW - hoursAgo * 36e5).toISOString() });

test('parses RSS and Atom headlines, drops descriptions, strips the Google News publisher suffix', () => {
  const rss = `<rss><channel><item><title><![CDATA[Dubai &amp; Abu Dhabi ports expand]]></title><link>https://a.com/1</link><pubDate>Mon, 23 Nov 2026 08:00:00 GMT</pubDate><description>long text</description></item>
    <item><title>Hormuz traffic eases - Khaleej Times</title><link>https://news.google.com/x</link><pubDate>Mon, 23 Nov 2026 07:00:00 GMT</pubDate><source url="https://khaleejtimes.com">Khaleej Times</source></item>
    <item><title>No link</title></item></channel></rss>`;
  const items = parseFeed(rss);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { title: 'Dubai & Abu Dhabi ports expand', link: 'https://a.com/1', published: '2026-11-23T08:00:00.000Z', source: null });
  assert.equal(items[1].title, 'Hormuz traffic eases');
  assert.equal(items[1].source, 'Khaleej Times');
  const atom = '<feed><entry><title>Grid upgrade</title><link href="https://b.com/2"/><updated>2026-11-22T10:00:00Z</updated></entry></feed>';
  assert.equal(parseFeed(atom)[0].link, 'https://b.com/2');
  assert.equal(decode('Emaar&#39;s <b>Q3</b> &rsquo;26'), 'Emaar\'s Q3 ’26');
});

test('classifies headlines into themes, chokepoints and countries', () => {
  const c = classify('Houthi drone attack near Red Sea shipping lane, Dubai port operators on alert');
  assert.ok(c.themes.includes('security') && c.themes.includes('infrastructure'));
  assert.deepEqual(c.chokepoints, ['red-sea']);
  assert.ok(c.countries.includes('AE'));
  assert.deepEqual(classify('OPEC crude output steady').themes, ['resources']);
});

test('computes daily changes and volatility, and never invents a month from stale monthly history', () => {
  const s = stats(series(100, 110));
  assert.ok(Math.abs(s.m1 - (110 / (100 + (10 * 48) / 69) - 1)) < 1e-9);
  assert.ok(s.vol >= 0);
  const stale = stats([['2025-03-31', 5000], ['2026-11-23', 6300]], { interval: '1mo', prevClose: 6200 });
  assert.equal(stale.m1, null); assert.equal(stale.stale, true);
  assert.ok(Math.abs(stale.d1 - (6300 / 6200 - 1)) < 1e-12);
  const fresh = stats([['2026-08-23', 4000], ['2026-10-24', 5000], ['2026-11-23', 5500]], { interval: '1mo', prevClose: null });
  assert.ok(Math.abs(fresh.m1 - 0.1) < 1e-12);
  assert.ok(Math.abs(fresh.m3 - 0.375) < 1e-12);
});

test('turns market moves and news clusters into ordered signals with reasons', () => {
  const pulse = {
    markets: [market('brent', series(130, 85)), market('us10y', series(4.0, 5.0)), market('vix', series(18, 28)),
      market('msci-uae', series(20, 23)), market('spx', series(7600, 7300)), market('dfm', [['2025-03-31', 5000], [day(0), 6300]], { interval: '1mo', prevClose: 6200 })],
    news: [...Array.from({ length: 4 }, (_, i) => news(`Tanker traffic in the Strait of Hormuz slows ${i}`)), news('Old Hormuz story', 24 * 6)],
  };
  const out = signals(pulse, NOW);
  const ids = out.map((s) => s.id);
  for (const id of ['oil-down', 'rates-up', 'risk-off', 'uae-rel', 'choke-hormuz']) assert.ok(ids.includes(id), id);
  assert.equal(out.find((s) => s.id === 'uae-rel').evidence[0], 'msci-uae');   // DFM month unavailable → daily MSCI UAE
  assert.equal(out.find((s) => s.id === 'choke-hormuz').title, 'Strait of Hormuz: 4 headlines in 3 days');
  assert.deepEqual([...new Set(out.map((s) => s.level))], ['alert', 'watch', 'positive'].filter((l) => out.some((s) => s.level === l)));
  for (const s of out) assert.ok(s.why.length > 30);
});

test('groups news by theme and country', () => {
  const items = [news('Dubai metro extension approved'), news('Saudi Aramco raises oil prices', 30), news('Golden visa rules eased in UAE')];
  const themes = byTheme(items, NOW);
  assert.equal(themes.find((t) => t.id === 'infrastructure').last7d, 1);
  assert.equal(themes.find((t) => t.id === 'resources').last24h, 0);
  const countries = byCountry(items, NOW);
  assert.equal(countries[0].label, 'UAE'); assert.equal(countries[0].total, 2);
});

test('decision notes need a stance, thesis, disconfirming evidence, conviction and a review date', () => {
  assert.equal(noteErrors({}).length, 6);
  const ok = { title: 'Dubai logistics platform', stance: 'Buy', thesis: 'Red Sea rerouting lifts Jebel Ali transshipment demand.', disconfirm: 'Suez traffic normalises for two quarters.', conviction: 3, reviewOn: '2026-12-15' };
  assert.deepEqual(noteErrors(ok), []);
  assert.equal(reviewDue(ok, Date.parse('2026-12-16')), true);
  assert.equal(reviewDue({ ...ok, closed: true }, Date.parse('2026-12-16')), false);
});

test('the shipped snapshot is well formed', () => {
  const p = JSON.parse(readFileSync(new URL('../data/pulse/pulse.json', import.meta.url), 'utf8'));
  assert.ok(Date.parse(p.generatedAt));
  assert.ok(p.markets.length >= 10 && p.news.length >= 20);
  for (const n of p.news) { assert.ok(n.title && /^https?:\/\//.test(n.link) && n.source); assert.equal('description' in n, false); }
  const levels = snapshotLevels(p);
  assert.ok(Object.values(levels).every(Number.isFinite));
});
