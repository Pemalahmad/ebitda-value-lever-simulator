#!/usr/bin/env node
// Market Pulse collector: delayed market prices and recent headlines from local and trade newspapers, written to
// data/pulse/pulse.json for the Market Pulse tab. Zero dependencies (Node >= 20). Run: npm run pulse
// CI runs it before every build and on a 6-hourly schedule; if a source fails, its last good data is kept.
//
// Only headlines, links, source names and dates are stored, never article text. Prices are delayed quotes.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFeed } from '../src/engine/pulse.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data/pulse/pulse.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ValueLeverPulse/1.0; +https://github.com/Pemalahmad/ebitda-value-lever-simulator)' };
const DAY = 864e5;

export const INSTRUMENTS = [
  { id: 'dfm', symbol: 'DFMGI.AE', label: 'DFM General Index', group: 'Dubai & GCC' },
  { id: 'tasi', symbol: '^TASI.SR', label: 'Tadawul All Share (Saudi)', group: 'Dubai & GCC' },
  { id: 'msci-uae', symbol: 'UAE', label: 'MSCI UAE (iShares ETF)', group: 'Dubai & GCC' },
  { id: 'emaar', symbol: 'EMAAR.AE', label: 'Emaar Properties', group: 'Dubai & GCC' },
  { id: 'emaar-dev', symbol: 'EMAARDEV.AE', label: 'Emaar Development', group: 'Dubai & GCC' },
  { id: 'enbd', symbol: 'EMIRATESNBD.AE', label: 'Emirates NBD', group: 'Dubai & GCC' },
  { id: 'dewa', symbol: 'DEWA.AE', label: 'DEWA', group: 'Dubai & GCC' },
  { id: 'salik', symbol: 'SALIK.AE', label: 'Salik', group: 'Dubai & GCC' },
  { id: 'spx', symbol: '^GSPC', label: 'S&P 500', group: 'Global indices' },
  { id: 'stoxx', symbol: '^STOXX', label: 'STOXX Europe 600', group: 'Global indices' },
  { id: 'nikkei', symbol: '^N225', label: 'Nikkei 225', group: 'Global indices' },
  { id: 'em', symbol: 'EEM', label: 'MSCI Emerging Markets (ETF)', group: 'Global indices' },
  { id: 'brent', symbol: 'BZ=F', label: 'Brent crude', group: 'Commodities', unit: '$/bbl' },
  { id: 'gold', symbol: 'GC=F', label: 'Gold', group: 'Commodities', unit: '$/oz' },
  { id: 'copper', symbol: 'HG=F', label: 'Copper', group: 'Commodities', unit: '$/lb' },
  { id: 'dxy', symbol: 'DX-Y.NYB', label: 'US dollar index (AED is pegged to USD)', group: 'FX & rates' },
  { id: 'eurusd', symbol: 'EURUSD=X', label: 'EUR / USD', group: 'FX & rates' },
  { id: 'us10y', symbol: '^TNX', label: 'US 10-year yield', group: 'FX & rates', unit: '%' },
  { id: 'vix', symbol: '^VIX', label: 'VIX (US equity volatility)', group: 'Risk & freight', invert: true },
  { id: 'freight', symbol: 'BDRY', label: 'Dry-bulk freight (Breakwave ETF)', group: 'Risk & freight' },
];

const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-AE&gl=AE&ceid=AE:en`;
export const FEEDS = [
  { name: 'Gulf News', url: 'https://gulfnews.com/feed', kind: 'Local newspaper' },
  { name: 'The National', url: 'https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml', kind: 'Local newspaper' },
  { name: 'Arabian Business', url: 'https://www.arabianbusiness.com/feed', kind: 'Regional business' },
  { name: 'Khaleej Times', url: gnews('site:khaleejtimes.com when:3d'), kind: 'Local newspaper (via Google News)' },
  { name: 'WAM (Emirates News Agency)', url: gnews('site:wam.ae when:3d'), kind: 'Official news agency (via Google News)' },
  { name: 'Zawya', url: gnews('site:zawya.com when:3d'), kind: 'Regional business (via Google News)' },
  { name: 'gCaptain', url: 'https://gcaptain.com/feed/', kind: 'Maritime' },
  { name: 'Splash247', url: 'https://splash247.com/feed/', kind: 'Maritime' },
  { name: 'Shipping chokepoints', url: gnews('(Strait of Hormuz OR Red Sea shipping OR Bab el-Mandeb OR Suez Canal) when:3d'), kind: 'Maritime (via Google News)', topic: true },
];

async function get(url, ms = 20000) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
}

async function chart(symbol, range, interval) {
  const res = (await (await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`)).json())?.chart?.result?.[0];
  const ts = res?.timestamp ?? [], close = res?.indicators?.quote?.[0]?.close ?? [];
  const series = ts.map((t, i) => [new Date(t * 1000).toISOString().slice(0, 10), close[i]]).filter(([, v]) => Number.isFinite(v)).map(([d, v]) => [d, Math.round(v * 1e4) / 1e4]);
  return { meta: res?.meta ?? {}, series };
}

async function market(inst) {
  const daily = await chart(inst.symbol, '6mo', '1d');
  if (daily.series.length >= 20) return { ...inst, currency: daily.meta.currency ?? null, interval: '1d', series: daily.series };
  // Some GCC indices only publish monthly history on this source: use it, plus today's price and the previous close.
  const monthly = await chart(inst.symbol, '5y', '1mo');
  const m = monthly.meta, today = m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString().slice(0, 10) : null;
  const series = monthly.series.filter(([d]) => !today || d.slice(0, 7) !== today.slice(0, 7));
  if (today && Number.isFinite(m.regularMarketPrice)) series.push([today, m.regularMarketPrice]);
  if (series.length < 4) throw new Error('no data');
  return { ...inst, currency: m.currency ?? null, interval: '1mo', prevClose: Number.isFinite(m.chartPreviousClose) ? m.chartPreviousClose : null, series };
}

async function feed(f, now) {
  const items = parseFeed(await (await get(f.url)).text())
    .filter((x) => x.published && now - Date.parse(x.published) <= 7 * DAY)
    .slice(0, 40)
    // Site searches are credited to the newspaper; topic searches keep each article's own publisher.
    .map((x) => ({ ...x, source: f.topic && x.source ? x.source : f.name, feed: f.name }));
  if (!items.length) throw new Error('no recent items');
  return items;
}

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { markets: [], news: [], sources: [] };
const now = Date.now(), sources = [];
const markets = await Promise.all(INSTRUMENTS.map(async (inst) => {
  try { const m = await market(inst); sources.push({ name: `${inst.label} (Yahoo Finance)`, kind: 'Market data, delayed', ok: true, count: m.series.length }); return m; }
  catch (e) {
    sources.push({ name: `${inst.label} (Yahoo Finance)`, kind: 'Market data, delayed', ok: false, error: e.message });
    return previous.markets.find((m) => m.id === inst.id) ?? null;   // keep the last good series
  }
}));
const news = [];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
for (const f of FEEDS) {
  if (f.url.includes('news.google.com')) await pause(2500);   // Google News rate-limits bursts
  try {
    let items;
    try { items = await feed(f, now); }
    catch (e) { if (!/429/.test(e.message)) throw e; await pause(8000); items = await feed(f, now); } news.push(...items); sources.push({ name: f.name, kind: f.kind, ok: true, count: items.length }); }
  catch (e) {
    sources.push({ name: f.name, kind: f.kind, ok: false, error: e.message });
    news.push(...previous.news.filter((n) => n.feed === f.name && now - Date.parse(n.published) <= 7 * DAY));
  }
}
const seen = new Set();
const deduped = news.filter((n) => { const k = n.title.toLowerCase().replace(/\W+/g, ' ').trim(); if (seen.has(k)) return false; seen.add(k); return true; })
  .sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date(now).toISOString(), markets: markets.filter(Boolean), news: deduped, sources }, null, 1) + '\n');
const ok = sources.filter((s) => s.ok).length;
console.log(`pulse.json: ${markets.filter(Boolean).length} markets, ${deduped.length} headlines, ${ok}/${sources.length} sources live`);
