import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSector, baseLevers, businessCase, reconciles, logicChecks,
  trackPlan, trackerChecks, plannedByMonth, planTargets, newPlan, rebasePlan, addInitiative, removeInitiative, updateInitiative,
  setActual, setMilestone, normalisePlan, planToCsv, planFromCsv, csvCell, examplePlan, EXAMPLE_TARGETS, dayNo, addDays, PLAN_MONTHS,
} from '../src/engine/index.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const us = getSector('urbanServices');
const failing = (checks) => checks.filter((c) => !c.ok && c.level === 'fail').map((c) => c.title);
const check = (checks, title) => checks.find((c) => c.title === title);

test('planned impact is the lever value from the business case, not typed in', () => {
  const plan = examplePlan();
  const t = trackPlan(us, plan);
  const bc = businessCase(us, { ...baseLevers(us), ...EXAMPLE_TARGETS });
  for (const r of t.rows) close(r.runRate, bc.initiatives.find((i) => i.id === r.leverId).runRate);
  close(t.plannedRunRate, bc.runRate, 1e-6);
  // Two initiatives on one lever share its value; the total does not change.
  const dup = { ...plan, initiatives: [...plan.initiatives, { ...plan.initiatives[0], id: 'EX1b', title: 'Second dispatch wave' }] };
  const t2 = trackPlan(us, dup);
  close(t2.rows[0].runRate * 2, bc.initiatives.find((i) => i.id === 'utilisation').runRate);
  close(t2.plannedRunRate, bc.runRate, 1e-6);
  assert.ok(trackerChecks(us, dup).find((c) => c.title === 'Planned impact equals the modelled lever value').ok);
});

test('planned EBITDA ramps linearly from the start date and is zero before it', () => {
  const m = plannedByMonth(36.5, 1, 1); // 0.1 a day at full run rate, one-month ramp
  assert.ok(m[0] > 0 && m[0] < 3);
  close(m[1], 3, 1e-9);
  close(m[3], 1, 1e-9); // ten-day close-out
  const late = plannedByMonth(36.5, 1, 45);
  assert.equal(late[0], 0);
  assert.ok(late[1] > 0 && late[1] < m[1]);
  const slow = plannedByMonth(36.5, 12, 1);
  assert.ok(slow[0] < slow[1] && slow[1] < slow[2], 'a long ramp rises month on month');
  assert.deepEqual(plannedByMonth(0, 6, 1), [0, 0, 0, 0]);
});

test('the example plan is labelled, passes every hard check and shows each state', () => {
  const plan = examplePlan();
  assert.equal(plan.example, true);
  assert.equal(plan.sectorId, 'urbanServices');
  const t = trackPlan(us, plan);
  assert.equal(t.asOfDay, 87);
  assert.deepEqual(t.closed, [1, 2]);
  assert.ok(reconciles(t.bridge, 1e-12));
  close(t.bridge.start, t.plannedToDate);
  close(t.bridge.end, t.realisedToDate);
  assert.deepEqual(failing(trackerChecks(us, plan, { ...baseLevers(us), ...EXAMPLE_TARGETS })), []);
  assert.ok(trackerChecks(us, plan, { ...baseLevers(us), ...EXAMPLE_TARGETS }).every((c) => c.ok), 'no warnings either');
  const titles = t.risks.map((r) => r.title).join(' | ');
  assert.match(titles, /past its due date/);
  assert.match(titles, /Day 60 milestone late/);
  assert.match(titles, /% of plan/);
  assert.equal(t.risks[0].severity, 'high', 'highest severity first');
  const ahead = t.rows.find((r) => r.id === 'EX5');
  assert.ok(ahead.over && ahead.overFlagged);
  assert.ok(t.rows.find((r) => r.id === 'EX4').cashOnly, 'DSO is a cash lever with no EBITDA');
});

test('realised above plan fails the check until it is explained', () => {
  const plan = updateInitiative(examplePlan(), 'EX1', { actuals: { m1: 5, m2: 5 } });
  const c = trackerChecks(us, plan);
  assert.equal(check(c, 'Realised never exceeds plan without a flag').ok, false);
  assert.match(trackPlan(us, plan).risks.map((r) => r.title).join(' '), /above plan with no explanation/);
  const explained = updateInitiative(plan, 'EX1', { note: 'One-off catch-up billing in month 2.' });
  assert.equal(check(trackerChecks(us, explained), 'Realised never exceeds plan without a flag').ok, true);
});

test('dates, milestones and lever links are checked', () => {
  const base = examplePlan();
  const badDates = updateInitiative(base, 'EX1', { due: addDays(base.start, -3) });
  assert.equal(check(trackerChecks(us, badDates), 'Start and due dates are in order').ok, false);
  const badMs = setMilestone(base, 'EX1', 0, { due: addDays(base.start, 80) });
  assert.equal(check(trackerChecks(us, badMs), 'Milestones are in order inside each initiative').ok, false);
  const unlinked = updateInitiative(base, 'EX1', { leverId: 'billRate' }); // a lever the plan does not move
  const c = trackerChecks(us, unlinked);
  assert.equal(check(c, 'Every initiative is linked to a lever in the plan').ok, false);
  assert.equal(check(c, 'Every planned lever has an initiative').ok, false);
  assert.equal(trackPlan(us, unlinked).rows[0].runRate, 0, 'no planned value without a link');
  const lateNotMarked = updateInitiative(base, 'EX3', { status: 'On track' });
  assert.equal(check(trackerChecks(us, lateNotMarked), 'Status agrees with dates and milestones').ok, false);
});

test('actuals for open months are flagged and kept out of the bridge', () => {
  const plan = setActual(examplePlan(), 'EX1', 3, '9');
  const t = trackPlan(us, plan);
  assert.equal(check(trackerChecks(us, plan), 'Actuals are entered only for closed months').ok, false);
  close(t.rows[0].realisedToDate, 0.28 + 0.84);
  const cleared = setActual(plan, 'EX1', 3, '');
  assert.equal(cleared.initiatives[0].actuals.m3, undefined);
});

test('a new plan turns each moved lever into an initiative with Day 30/60/100 milestones', () => {
  const s = getSector('hospitality');
  const levers = { ...baseLevers(s), occupancy: 80, energy: 46 };
  const plan = newPlan(s, levers, '2027-01-04');
  assert.deepEqual(Object.keys(plan.targets).sort(), ['energy', 'occupancy']);
  assert.equal(plan.initiatives.length, 2);
  const i = plan.initiatives.find((x) => x.leverId === 'occupancy');
  assert.equal(i.owner, 'Commercial Director');
  assert.deepEqual(i.milestones.map((m) => m.label), ['Day 30', 'Day 60', 'Day 100']);
  assert.deepEqual(i.milestones.map((m) => dayNo(plan.start, m.due)), [30, 60, 100]);
  assert.equal(dayNo(plan.start, i.due), 100);
  assert.deepEqual(failing(trackerChecks(s, plan, levers)), []);
  // Editing helpers never mutate the plan they are given.
  const more = addInitiative(s, plan);
  assert.equal(plan.initiatives.length, 2);
  assert.equal(removeInitiative(more, more.initiatives[2].id).initiatives.length, 2);
  const moved = { ...levers, adr: 1250 };
  assert.equal(check(trackerChecks(s, plan, moved), 'Plan targets match the Value Plan levers').ok, false);
  assert.deepEqual(Object.keys(rebasePlan(s, plan, moved).targets).sort(), ['adr', 'energy', 'occupancy']);
  assert.deepEqual(planTargets(s, baseLevers(s)), {});
});

test('CSV export and import round-trip the plan', () => {
  const plan = examplePlan();
  const csv = planToCsv(us, plan);
  assert.equal(csv.trim().split('\n').length, plan.initiatives.length + 1);
  const back = planFromCsv(csv);
  assert.deepEqual(back.errors, []);
  assert.deepEqual(back.plan, plan);
});

test('CSV cells cannot run as spreadsheet formulas, and import restores the text', () => {
  assert.equal(csvCell('=HYPERLINK("x")', true), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('-0.5'), '-0.5', 'numbers are left alone');
  const plan = updateInitiative(examplePlan(), 'EX1', { title: '=1+1', owner: '@ops, dispatch', note: 'Line "one"' });
  const csv = planToCsv(us, plan);
  assert.ok(!/(^|,)=1\+1/m.test(csv));
  const back = planFromCsv(csv).plan.initiatives[0];
  assert.equal(back.title, '=1+1');
  assert.equal(back.owner, '@ops, dispatch');
  assert.equal(back.note, 'Line "one"');
});

test('CSV import rejects bad files with reasons and imports nothing', () => {
  const csv = planToCsv(us, examplePlan());
  const [head, ...rows] = csv.trim().split('\n');
  const swap = (from, to) => [head, rows[0].replace(from, to), ...rows.slice(1)].join('\n');
  assert.match(planFromCsv(swap(',utilisation,', ',warpDrive,')).errors.join(), /unknown lever/);
  assert.match(planFromCsv(swap(',On track,', ',Probably fine,')).errors.join(), /status must be one of/);
  assert.match(planFromCsv(swap(',2026-12-09,', ',next week,')).errors.join(), /must be a date/);
  assert.match(planFromCsv(csv.replace(/^urbanServices/gm, 'casino')).errors.join(), /Unknown business/);
  assert.match(planFromCsv('title,owner\nA,B\n').errors.join(), /Missing columns/);
  assert.match(planFromCsv('x'.repeat(200_001)).errors.join(), /200 KB/);
  for (const bad of [swap(',utilisation,', ',warpDrive,'), 'title\n']) assert.equal(planFromCsv(bad).plan, null);
});

test('stored plans are validated: bad shapes are dropped, values clamped and text capped', () => {
  assert.equal(normalisePlan(null), null);
  assert.equal(normalisePlan({ sectorId: 'nope', start: '2026-01-01' }), null);
  assert.equal(normalisePlan({ sectorId: 'urbanServices', start: 'soon' }), null);
  const p = normalisePlan(JSON.parse('{"sectorId":"urbanServices","start":"2026-01-01","threshold":7,"targets":{"utilisation":999,"__proto__":{"x":1},"warp":3},"initiatives":[{"title":"' + 'a'.repeat(500) + '","leverId":"warp","status":"Maybe","actuals":{"m1":"1.5","m2":"x","m9":4}}]}'));
  assert.deepEqual(p.targets, { utilisation: 92 });
  assert.equal(p.threshold, 0.8);
  assert.equal({}.x, undefined);
  const i = p.initiatives[0];
  assert.equal(i.title.length, 140);
  assert.equal(i.leverId, '');
  assert.equal(i.status, 'Not started');
  assert.deepEqual(i.actuals, { m1: 1.5 });
  assert.equal(PLAN_MONTHS.length, 4);
});

test('the workbook checker runs the tracker checks for every saved plan', () => {
  const all = logicChecks({ trackers: { urbanServices: examplePlan() } });
  const mine = all.filter((c) => c.area === '100-day tracker · Integrated Urban Services');
  assert.equal(mine.length, 10, 'the target-match check needs the Value Plan levers');
  assert.ok(mine.every((c) => c.status === 'pass'));
  const withLevers = logicChecks({ bySector: { urbanServices: { ...baseLevers(us), ...EXAMPLE_TARGETS } }, trackers: { urbanServices: examplePlan() } });
  assert.equal(withLevers.filter((c) => c.area.startsWith('100-day tracker')).length, 11);
  const broken = logicChecks({ trackers: { urbanServices: updateInitiative(examplePlan(), 'EX2', { leverId: '' }) } });
  assert.ok(broken.some((c) => c.area.startsWith('100-day tracker') && c.status === 'fail'));
});
