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

import { CRITERIA, DEFAULT_WEIGHTS, score, rank, tier, normaliseWeights } from '../src/engine/index.js';

test('opportunity scoring: bounds, weights and ranking', () => {
  const all5 = { scores: Object.fromEntries(CRITERIA.map((c) => [c.id, 5])) };
  const all1 = { scores: Object.fromEntries(CRITERIA.map((c) => [c.id, 1])) };
  assert.equal(score(all5), 100);
  assert.equal(score(all1), 0);
  const w = normaliseWeights(DEFAULT_WEIGHTS);
  close(Object.values(w).reduce((a, b) => a + b, 0), 1);
  const a = { id: 'a', scores: { growth: 5, fit: 1, value: 3, feasibility: 3, risk: 3 } };
  const b = { id: 'b', scores: { growth: 1, fit: 5, value: 3, feasibility: 3, risk: 3 } };
  assert.equal(rank([a, b], { growth: 50, fit: 0, value: 0, feasibility: 0, risk: 0 })[0].id, 'a');
  assert.equal(rank([a, b], { growth: 0, fit: 50, value: 0, feasibility: 0, risk: 0 })[0].id, 'b');
  assert.equal(tier(75), 'Pursue');
  assert.equal(tier(30), 'Deprioritise');
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

test('opportunity data: plays exist, presets run, every figure is sourced', async () => {
  const data = JSON.parse(readFileSync(new URL('../data/opportunities/analysis.json', import.meta.url), 'utf8'));
  const { PLAYS: P, runPlay: run } = await import('../src/engine/index.js');
  const ids = new Set(P.map((p) => p.id));
  const scoreOk = (s) => CRITERIA.every((c) => Number.isInteger(s[c.id]) && s[c.id] >= 1 && s[c.id] <= 5);
  for (const s of data.sectors) { assert.ok(scoreOk(s.scores), s.id); for (const f of s.facts) assert.match(f.source.url, /^https:\/\//, s.id); }
  for (const t of data.themes) {
    assert.ok(scoreOk(t.scores), t.id);
    for (const p of t.plays) assert.ok(ids.has(p), `${t.id} → ${p}`);
    for (const f of t.facts) assert.match(f.source.url, /^https:\/\//, t.id);
    for (const [p, preset] of Object.entries(t.presets ?? {})) assert.ok(Number.isFinite(run(P.find((x) => x.id === p), preset).value));
  }
  for (const t of data.targets) {
    assert.ok(scoreOk(t.scores), t.id);
    if (t.play) assert.ok(ids.has(t.play), t.id);
    if (t.preset) {
      const play = P.find((x) => x.id === t.play);
      for (const [k, v] of Object.entries(t.preset)) { const prm = play.params.find((x) => x.id === k); assert.ok(prm && v >= prm.min && v <= prm.max, `${t.id}.${k}`); }
    }
    for (const m of t.metrics) assert.match(m.source.url, /^https:\/\//, t.id);
  }
});

test('Dubai Holding and fund data: every move maps to a known play or archetype and is sourced', async () => {
  const dh = JSON.parse(readFileSync(new URL('../data/benchmarks/dubai-holding.json', import.meta.url), 'utf8'));
  const funds = JSON.parse(readFileSync(new URL('../data/benchmarks/funds.json', import.meta.url), 'utf8'));
  const ids = new Set(PLAYS.map((p) => p.id));
  for (const m of [...dh.moves, ...funds.funds.flatMap((f) => f.moves)]) {
    assert.ok(m.play === null || ids.has(m.play), m.title);
    assert.match(m.source.url, /^https:\/\//, m.title);
    if (m.preset) assert.ok(Number.isFinite(runPlay(getPlay(m.play), m.preset).value));
  }
  // The REIT preset should reproduce the ~AED 2.1bn the Dubai Residential REIT IPO raised.
  const reit = dh.moves.find((m) => m.play === 'reit');
  const r = runPlay(getPlay('reit'), reit.preset);
  assert.ok(Math.abs(r.cash + r.lines.find((l) => /fees/i.test(l.label)).value * -1 - 2145) < 60, `REIT gross proceeds ${r.cash}`);
});
