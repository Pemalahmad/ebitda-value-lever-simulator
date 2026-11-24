import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getSector, baseLevers, compare, priceVolumeBridge, lineBridge, rolling12, consolidate, assumptionSummary, reconciles, newcoPlan, NEWCO_PRESETS, logicChecks, dataGaps } from '../src/engine/index.js';

const official = JSON.parse(readFileSync(new URL('../data/market/dld-official.json', import.meta.url)));
const pulse = JSON.parse(readFileSync(new URL('../data/pulse/pulse.json', import.meta.url)));

test('price/volume bridge reconciles and splits the change correctly', () => {
  const b = priceVolumeBridge({ value: 761, volume: 226000 }, { value: 917, volume: 270328 });
  assert.ok(reconciles(b));
  assert.ok(b.steps[0].delta > 0 && b.steps[1].delta > 0);
  const flat = priceVolumeBridge({ value: 100, volume: 10 }, { value: 120, volume: 10 });
  assert.equal(flat.steps[0].delta, 0);
  assert.equal(flat.steps[1].delta, 20);
});

test('P&L line bridge reconciles to scenario EBITDA', () => {
  const s = getSector('hospitality');
  const lv = { ...baseLevers(s), occupancy: 80, adr: 1220 };
  const b = lineBridge(s, lv);
  assert.ok(reconciles(b, 1e-6));
  assert.equal(b.end, compare(s, lv).scn.ebitda);
});

test('rolling 12 months starts at baseline and converges to run rate', () => {
  const s = getSector('realEstate');
  const lv = { ...baseLevers(s), price: 1950 };
  const r = rolling12(s, lv, 36);
  const c = compare(s, lv);
  assert.ok(r[0].r12 > c.base.ebitda && r[0].r12 < c.scn.ebitda);
  assert.ok(Math.abs(r.at(-1).r12 - c.scn.ebitda) < 1e-6);
  const flat = rolling12(s, baseLevers(s), 24);
  assert.ok(flat.every((m) => Math.abs(m.r12 - c.base.ebitda) < 1e-9));
});

test('intercompany eliminations: opex nets out of EBITDA, capitalised sales remove unrealised profit', () => {
  const ents = [{ id: 'a', name: 'A', revenue: 100, ebitda: 20 }, { id: 'b', name: 'B', revenue: 200, ebitda: 50 }];
  const r = consolidate(ents, [{ from: 'a', to: 'b', amount: 30, treatment: 'opex' }, { from: 'b', to: 'a', amount: 40, treatment: 'capex', margin: 25 }]);
  assert.equal(r.revenue, 230);
  assert.equal(r.ebitda, 60);
  assert.ok(r.balanced);
  assert.ok(reconciles(r.bridge) && reconciles(r.revenueBridge));
  assert.match(consolidate(ents, [{ from: 'a', to: 'b', amount: 150 }]).issues[0], /more inside the group/);
});

test('assumption summary ranks drivers and shares add to one', () => {
  const s = getSector('retail');
  const a = assumptionSummary(s, baseLevers(s), 0.1);
  assert.ok(a.rows[0].swing >= a.rows.at(-1).swing);
  assert.ok(Math.abs(a.rows.reduce((x, r) => x + r.share, 0) - 1) < 1e-9);
});

test('new-company plan adds up, and its checks pass for every preset', () => {
  for (const [id, p] of Object.entries(NEWCO_PRESETS)) {
    const plan = newcoPlan(p);
    for (const c of plan.checks.filter((x) => /adds up/.test(x.title))) assert.ok(c.ok, `${id}: ${c.title}`);
    assert.ok(reconciles(plan.bridge, 1e-9), id);
    assert.ok(plan.peakFunding >= 0, id);
  }
  const cheap = newcoPlan({ ...NEWCO_PRESETS.saas, fitout: 0, equipment: 0 });
  assert.ok(cheap.peakFunding < newcoPlan(NEWCO_PRESETS.saas).peakFunding);
});

test('logic checker passes the shipped workbook and the gap finder lists missing data', () => {
  const checks = logicChecks({ official, pulse, now: Date.parse(pulse.generatedAt) });
  const fails = checks.filter((c) => c.status === 'fail');
  assert.deepEqual(fails, []);
  assert.ok(checks.length > 60);
  const gaps = dataGaps({ official, pulse, aggregate: null });
  assert.ok(gaps.some((g) => g.item === 'Deal-level DLD transactions'));
  assert.ok(gaps.some((g) => g.item === 'Intercompany transactions'));
});
