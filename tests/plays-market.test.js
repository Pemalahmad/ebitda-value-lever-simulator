import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAYS, runPlay, getPlay, parseCsv, normalise, aggregate } from '../src/engine/index.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('every play runs at defaults, reconciles its value lines and stays finite', () => {
  assert.ok(PLAYS.length >= 7);
  for (const p of PLAYS) {
    const r = runPlay(p);
    close(r.value, r.lines.reduce((a, l) => a + l.value, 0));
    for (const k of ['value', 'cash', 'ebitdaRunRate']) assert.ok(Number.isFinite(r[k]), `${p.id}.${k}`);
    for (const x of p.params) assert.ok(x.min <= x.base && x.base <= x.max, `${p.id}.${x.id}`);
  }
});

test('REIT: tighter listing yield creates more value; proceeds follow stake', () => {
  const reit = getPlay('reit');
  assert.ok(runPlay(reit, { listCap: 6 }).value > runPlay(reit, { listCap: 7 }).value);
  const a = runPlay(reit, { stake: 10 }).cash;
  const b = runPlay(reit, { stake: 20 }).cash;
  close(b, 2 * a, 1e-6);
});

test('IPO below book multiple destroys value and is flagged', () => {
  const r = runPlay(getPlay('ipo'), { ipoMultiple: 7, bookMultiple: 10 });
  assert.ok(r.value < 0);
  assert.ok(r.risks.length > 0);
});

test('acquisition: multiple arbitrage is zero when buying at the group multiple', () => {
  const r = runPlay(getPlay('acquisition'), { buyMultiple: 11, groupMultiple: 11, synergy: 0 });
  close(r.lines[0].value, 0);
  assert.ok(r.value < 0); // only fees remain
});

test('land JV loses money when price does not cover build plus land', () => {
  const r = runPlay(getPlay('landJv'), { price: 1200, build: 1000, marketLand: 400 });
  assert.ok(r.lines[1].value < 0);
  assert.ok(r.risks.length > 0);
});

test('play params are clamped to their ranges', () => {
  const r = runPlay(getPlay('platform'), { synergy: 99 });
  assert.equal(r.params.synergy, 20);
  assert.throws(() => getPlay('nope'), /Unknown play/);
});

test('CSV parser handles quotes, escaped quotes, CRLF and BOM', () => {
  const rows = parseCsv('﻿a,b,c\r\n1,"x, y",3\r\n4,"he said ""hi""",6\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].b, 'x, y');
  assert.equal(rows[1].b, 'he said "hi"');
  assert.equal(rows[0].a, '1');
});

test('DLD ingest: synthetic fixture aggregates and reconciles', () => {
  const txns = parseCsv(readFileSync(new URL('./fixtures/dld-synthetic.csv', import.meta.url), 'utf8')).map(normalise);
  assert.equal(txns.length, 540);
  assert.equal(txns[0].date.toISOString().slice(0, 10), '2026-04-01');
  const agg = aggregate(txns);
  assert.equal(agg.totals.deals, 540);
  close(agg.months.reduce((a, m) => a + m.deals, 0), 540);
  close(agg.months.reduce((a, m) => a + m.valueAedBn, 0), agg.totals.valueAedBn, 1e-9);
  // Fixture design: Test Marina reprices down ~7% in the second half, Synthetic Bay up ~5%.
  assert.equal(agg.momentum.drops[0].area, 'Test Marina');
  assert.ok(agg.momentum.increases.some((m) => m.area === 'Synthetic Bay'));
  assert.ok(agg.totals.offPlanShare > 0.4 && agg.totals.offPlanShare < 0.8);
});

test('DLD ingest rejects files without valid transactions', () => {
  assert.throws(() => aggregate(parseCsv('x,y\n1,2').map(normalise)), /No valid transactions/);
});

test('DLD aggregate exposes the tracker views (bedrooms, bands, trend, records)', () => {
  const txns = parseCsv(readFileSync(new URL('./fixtures/dld-synthetic.csv', import.meta.url), 'utf8')).map(normalise);
  const agg = aggregate(txns);
  assert.equal(agg.priceBands.reduce((s, b) => s + b.deals, 0), agg.totals.sales);
  assert.ok(agg.trend.length > 90 && agg.trend.every((t) => Number.isFinite(t.rollingPpsm)));
  assert.equal(agg.records.length, 540);
  assert.ok(agg.topDeals[0].a >= agg.topDeals[9].a);
  assert.ok(Number.isFinite(agg.registration.offPlanPremium));
});
