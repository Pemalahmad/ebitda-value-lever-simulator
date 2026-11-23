#!/usr/bin/env node
// Generate a board memo from the command line.
//
//   node bin/value-memo.js --sector hospitality --set occupancy=78,adr=1200 > memo.md
//   node bin/value-memo.js --sector retail --scenario "Destination upgrade"
//   node bin/value-memo.js --sector urbanServices --file data/scenarios/fm-utilisation.json
//   node bin/value-memo.js --list
import { readFileSync } from 'node:fs';
import { SECTORS, getSector, buildMemo, evaluate, fmt } from '../src/engine/index.js';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));

if (args.list || args.help || !args.sector) {
  if (!args.list) console.error('Usage: value-memo --sector <id> [--set k=v,k=v] [--scenario "<name>"] [--file scenario.json] [--summary]\n');
  for (const s of SECTORS) {
    console.log(`${s.id.padEnd(15)} ${s.name}`);
    console.log(`  levers:    ${s.levers.map((l) => `${l.id}=${l.base}`).join(', ')}`);
    console.log(`  scenarios: ${Object.keys(s.scenarios).join(' | ')}`);
  }
  process.exit(args.list ? 0 : 1);
}

try {
  const sector = getSector(args.sector);
  let levers = {};
  if (args.file) {
    const f = JSON.parse(readFileSync(args.file, 'utf8'));
    levers = f.levers ?? f;
  }
  if (args.scenario) {
    const sc = sector.scenarios[args.scenario];
    if (!sc) throw new Error(`Unknown scenario "${args.scenario}". Options: ${Object.keys(sector.scenarios).join(', ')}`);
    levers = { ...levers, ...sc };
  }
  if (typeof args.set === 'string') {
    for (const pair of args.set.split(',')) {
      const [k, v] = pair.split('=');
      if (!sector.levers.some((l) => l.id === k)) throw new Error(`Unknown lever "${k}" for ${sector.id}`);
      levers[k] = Number(v);
    }
  }
  if (args.summary) {
    const e = evaluate(sector, levers);
    console.log(`${sector.name}: EBITDA ${fmt.money(e.cmp.scn.ebitda)} (${fmt.money(e.cmp.dEbitda, { sign: true })}), value created ${fmt.money(e.cmp.valueCreated, { sign: true })}, NPV ${fmt.money(e.bc.npv, { sign: true })}, confidence ${e.confidence}, rank ${e.rank.name}`);
  } else {
    process.stdout.write(buildMemo(sector, levers) + '\n');
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
