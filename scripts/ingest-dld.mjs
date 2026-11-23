#!/usr/bin/env node
// Turn a DLD open-data Transactions CSV into the dashboard's market aggregate.
//
// 1. Download the CSV yourself: dubailand.gov.ae -> Open Data -> Real Estate Data
//    -> Transactions -> pick a date range -> "Download as CSV". (The page has a
//    captcha by design, so this step stays manual.)
// 2. node scripts/ingest-dld.mjs path/to/transactions.csv [more.csv ...]
// 3. Rebuild: npm run build. The Market Tracker tab then shows deal-level analytics
//    (area momentum, top projects, monthly flow) alongside the official aggregates.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseCsv, normalise, aggregate } from '../src/engine/market.js';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('Usage: node scripts/ingest-dld.mjs <dld-transactions.csv> [...]');
  process.exit(1);
}
const out = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'data/market/dld-aggregate.json';

const txns = files.flatMap((f) => parseCsv(readFileSync(f, 'utf8')).map(normalise));
const agg = aggregate(txns);
agg.source = { name: 'Dubai Land Department open data: Transactions', url: 'https://dubailand.gov.ae/en/open-data/real-estate-data/', files: files.map((f) => f.split('/').pop()), generated: new Date().toISOString().slice(0, 10) };
mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
writeFileSync(out, JSON.stringify(agg, null, 2));
console.log(`${agg.totals.deals.toLocaleString('en-US')} transactions (${agg.period.start} → ${agg.period.end}), AED ${agg.totals.valueAedBn.toFixed(1)}bn → ${out}`);
