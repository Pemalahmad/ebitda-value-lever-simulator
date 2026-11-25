import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const entry = html.match(/<script[^>]+src="\.\/([^"?]+\.js)"/)?.[1] ?? html.match(/<script[^>]+src="\/([^"?]+\.js)"/)?.[1];
if (!entry) throw new Error('Could not find the production entry script in dist/index.html.');

const entryBytes = statSync(new URL(entry, dist)).size;
const cssAssets = readdirSync(new URL('assets/', dist)).filter((file) => file.endsWith('.css'));
const totalCssBytes = cssAssets.reduce((sum, file) => sum + statSync(join(new URL('assets/', dist).pathname, file)).size, 0);
const linkedCss = [...html.matchAll(/<link[^>]+href="\.\/([^"?]+\.css)"/g)].map((match) => match[1]);
const initialCssBytes = linkedCss.reduce((sum, file) => sum + statSync(new URL(file, dist)).size, 0);
const limits = { entry: 300 * 1024, initialCss: 120 * 1024, totalCss: 140 * 1024 };

if (entryBytes > limits.entry) throw new Error(`Initial JavaScript is ${(entryBytes / 1024).toFixed(1)} kB; budget is 300 kB.`);
if (initialCssBytes > limits.initialCss) throw new Error(`Initial CSS is ${(initialCssBytes / 1024).toFixed(1)} kB; budget is 120 kB.`);
if (totalCssBytes > limits.totalCss) throw new Error(`Total CSS is ${(totalCssBytes / 1024).toFixed(1)} kB; budget is 140 kB.`);
console.log(`Bundle budgets pass: initial JS ${(entryBytes / 1024).toFixed(1)} kB / 300 kB; initial CSS ${(initialCssBytes / 1024).toFixed(1)} kB / 120 kB; total CSS ${(totalCssBytes / 1024).toFixed(1)} kB / 140 kB.`);
