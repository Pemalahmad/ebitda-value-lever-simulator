import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTORS, getSector, run, compare, baseLevers, sanitize, investmentByLever,
  bridge, tornado, leverage, grid, businessCase, realisationByYear, npv, irr,
  scorecard, rag, evaluate, rankFor, newAchievements, buildMemo, renderMarkdown,
} from '../src/engine/index.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('six group businesses, each with levers, scenarios and missions', () => {
  assert.equal(SECTORS.length, 6);
  for (const s of SECTORS) {
    assert.ok(s.levers.length >= 6, s.id);
    assert.ok(Object.keys(s.scenarios).length >= 3, s.id);
    assert.ok(s.missions.length >= 3, s.id);
    for (const l of s.levers) {
      assert.ok(l.min <= l.base && l.base <= l.max, `${s.id}.${l.id} base inside range`);
      assert.ok([1, -1].includes(l.good), `${s.id}.${l.id} direction`);
      assert.ok(l.costPerUnit >= 0 && l.rampMonths > 0, `${s.id}.${l.id} cost/ramp`);
    }
  }
});

test('baseline P&L reconciles: revenue lines minus cost lines equals EBITDA', () => {
  for (const s of SECTORS) {
    const r = run(s, {});
    const rev = r.lines.filter((l) => l.kind === 'revenue').reduce((a, l) => a + l.value, 0);
    const net = r.lines.reduce((a, l) => a + l.value, 0);
    close(rev, r.revenue, 1e-6);
    close(net, r.ebitda, 1e-6);
    assert.ok(r.ebitda > 0 && r.margin > 0.05 && r.margin < 0.8, `${s.id} plausible margin ${r.margin}`);
  }
});

test('baseline compares to itself with zero change and zero investment', () => {
  for (const s of SECTORS) {
    const c = compare(s, {});
    close(c.dEbitda, 0);
    close(c.valueCreated, 0);
    assert.equal(c.invest, 0);
  }
});

test('sanitize clamps out-of-range values and rejects non-numbers', () => {
  const s = getSector('hospitality');
  assert.equal(sanitize(s, { occupancy: 500 }).occupancy, 92);
  assert.equal(sanitize(s, { occupancy: -1 }).occupancy, 55);
  assert.throws(() => sanitize(s, { occupancy: 'abc' }), /must be a number/);
  assert.throws(() => getSector('nope'), /Unknown sector/);
});

test('enterprise value follows the valuation method', () => {
  const h = getSector('hospitality');
  const r = run(h, {});
  close(r.ev, r.ebitda * 14);
  const m = getSector('retail');
  const rm = run(m, {});
  close(rm.ev, rm.ebitda / 0.0725);
});

test('price elasticity: raising hotel ADR lowers realised occupancy', () => {
  const h = getSector('hospitality');
  const lo = run(h, { adr: 1150 }).kpis.occupancy.value;
  const hi = run(h, { adr: 1400 }).kpis.occupancy.value;
  assert.ok(hi < lo);
});

test('FM utilisation is a top-two driver and is monotonic', () => {
  const u = getSector('urbanServices');
  let prev = -Infinity;
  for (const util of [60, 65, 70, 75, 80, 85]) {
    const e = run(u, { utilisation: util }).ebitda;
    assert.ok(e > prev, `utilisation ${util}`);
    prev = e;
  }
  assert.ok(tornado(u, {}).slice(0, 2).some((t) => t.id === 'utilisation'));
});

test('insourcing (lower subcontract share) improves FM EBITDA at baseline utilisation', () => {
  const u = getSector('urbanServices');
  assert.ok(run(u, { subShare: 20 }).ebitda > run(u, {}).ebitda);
});

test('working-capital levers release cash without changing EBITDA', () => {
  const re = getSector('realEstate');
  const c = compare(re, { cycle: 26 });
  close(c.dEbitda, 0);
  assert.ok(c.cashRelease > 300);
  const fm = compare(getSector('urbanServices'), { dso: 75 });
  assert.ok(fm.cashRelease > 60);
});

test('investment is charged only for value-creating moves', () => {
  const h = getSector('hospitality');
  const inv = investmentByLever(h, { occupancy: 78, adr: 1100 });
  close(inv.occupancy, 4 * h.levers.find((l) => l.id === 'occupancy').costPerUnit);
  assert.equal(inv.adr, 0);
});

test('EBITDA bridge reconciles from baseline to scenario', () => {
  for (const s of SECTORS) {
    const sc = Object.values(s.scenarios)[0];
    const b = bridge(s, sc);
    const sum = b.steps.reduce((a, x) => a + x.delta, b.start);
    close(sum, b.end, 0.06);
  }
});

test('tornado is sorted by swing; leverage by value created', () => {
  for (const s of SECTORS) {
    const t = tornado(s, {});
    for (let i = 1; i < t.length; i++) assert.ok(t[i - 1].swing >= t[i].swing);
    const l = leverage(s, {});
    for (let i = 1; i < l.length; i++) assert.ok(l[i - 1].valueGain >= l[i].valueGain);
  }
});

test('two-way grid is centred on the current scenario', () => {
  const s = getSector('leisure');
  const g = grid(s, {}, 'cac', 'perCap');
  assert.equal(g.cells.length, 5);
  close(g.cells[2][2], g.current);
});

test('realisation ramps linearly and caps at 100%', () => {
  const r = realisationByYear(12, 3);
  close(r[0], 6.5 / 12);
  close(r[1], 1);
  close(realisationByYear(1, 1)[0], 1);
});

test('NPV and IRR agree', () => {
  const flows = [-100, 30, 40, 50, 60];
  const rate = irr(flows);
  close(npv(rate, flows), 0, 1e-4);
  assert.ok(Number.isNaN(irr([10, 10])));
});

test('business case initiatives sum to the scenario run-rate EBITDA', () => {
  for (const s of SECTORS) {
    const sc = Object.values(s.scenarios)[1];
    const bc = businessCase(s, sc);
    const sum = bc.initiatives.reduce((a, i) => a + i.runRate, 0);
    close(sum, compare(s, sc).dEbitda, 0.06);
    assert.equal(bc.flows.length, 6);
  }
});

test('downside scenarios destroy value and are flagged as such in the memo', () => {
  const s = getSector('hospitality');
  const e = evaluate(s, s.scenarios['Softer market']);
  assert.ok(e.cmp.valueCreated < 0);
  assert.ok(e.bc.npv < 0);
  assert.match(buildMemo(s, s.scenarios['Softer market']), /Do not approve as framed/);
});

test('RAG statuses respect direction and tolerance', () => {
  assert.equal(rag(100, 100, 'higher'), 'green');
  assert.equal(rag(97, 100, 'higher'), 'amber');
  assert.equal(rag(90, 100, 'higher'), 'red');
  assert.equal(rag(9, 10, 'lower'), 'green');
  assert.equal(rag(10.4, 10, 'lower'), 'amber');
});

test('scorecard covers all four perspectives', () => {
  for (const s of SECTORS) {
    const sc = scorecard(s, {});
    assert.deepEqual(sc.perspectives.map((p) => p.name), ['Financial', 'Customer', 'Internal Process', 'Learning & Growth']);
    assert.ok(sc.perspectives.every((p) => p.items.length > 0), s.id);
  }
});

test('risk flags cost board confidence', () => {
  const s = getSector('leisure');
  const safe = evaluate(s, {}).confidence;
  const risky = evaluate(s, { staffPerVisitor: 32 });
  assert.ok(risky.cmp.scn.flags.some((f) => f.id === 'safety'));
  assert.ok(risky.confidence < safe);
});

test('over-budget programmes lose confidence and are called out', () => {
  const s = getSector('community');
  const e = evaluate(s, { digital: 85, procurement: 15, collection: 98, retention: 99 });
  assert.ok(e.cmp.overBudget);
  assert.match(buildMemo(s, { digital: 85, procurement: 15, collection: 98, retention: 99 }), /Over budget/);
});

test('ranks need both value and confidence', () => {
  assert.equal(rankFor(0, 100).name, 'Analyst');
  assert.equal(rankFor(0.25, 90).name, 'Chief Value Officer');
  assert.equal(rankFor(0.25, 40).name, 'Associate');
});

test('missions and achievements evaluate to progress in [0,1]', () => {
  for (const s of SECTORS) {
    for (const sc of [{}, ...Object.values(s.scenarios)]) {
      const e = evaluate(s, sc);
      for (const m of e.missions) assert.ok(m.progress >= 0 && m.progress <= 1, `${m.id} ${m.progress}`);
    }
  }
  const e = evaluate(getSector('hospitality'), { occupancy: 80 });
  assert.ok(newAchievements(e, []).some((a) => a.id === 'firstLever'));
  assert.ok(!newAchievements(e, ['firstLever']).some((a) => a.id === 'firstLever'));
});

test('memo is deterministic and leads with the answer', () => {
  for (const s of SECTORS) {
    const sc = Object.values(s.scenarios)[0];
    const a = buildMemo(s, sc, { date: '2026-01-01' });
    const b = buildMemo(s, sc, { date: '2026-01-01' });
    assert.equal(a, b);
    const first = a.indexOf('## 1. Recommendation');
    assert.ok(first > 0 && first < a.indexOf('## 2.'));
    for (const h of ['EBITDA bridge', 'Highest-leverage value drivers', 'Trade-offs and risks', 'Balanced Scorecard impact', 'Benefits realisation plan', 'Decisions requested']) assert.ok(a.includes(h), `${s.id}: ${h}`);
    assert.ok(!/NaN|undefined|Infinity/.test(a), `${s.id} memo has no broken numbers`);
  }
  const baseMemo = buildMemo(getSector('retail'), {}, { date: '2026-01-01' });
  assert.match(baseMemo, /No levers have been moved/);
});

test('markdown renderer escapes HTML and renders tables', () => {
  const html = renderMarkdown('# T <script>\n\n| a | b |\n|---|---:|\n| 1 | **2** |\n\n- x\n- y');
  assert.ok(!html.includes('<script>'));
  assert.match(html, /<table>/);
  assert.match(html, /<strong>2<\/strong>/);
  assert.match(html, /<ul><li>x<\/li><li>y<\/li><\/ul>/);
});

test('baseLevers matches lever bases', () => {
  for (const s of SECTORS) for (const l of s.levers) assert.equal(baseLevers(s)[l.id], l.base);
});
