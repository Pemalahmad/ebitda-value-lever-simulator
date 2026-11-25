import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const entry = html.match(/<script[^>]+src="\.\/([^"?]+\.js)"/)?.[1] ?? html.match(/<script[^>]+src="\/([^"?]+\.js)"/)?.[1];
if (!entry) throw new Error('Could not find the production entry script in dist/index.html.');

const entryBytes = statSync(new URL(entry, dist)).size;
const cssBytes = readdirSync(new URL('assets/', dist)).filter((file) => file.endsWith('.css')).reduce((sum, file) => sum + statSync(join(new URL('assets/', dist).pathname, file)).size, 0);
const limits = { entry: 300 * 1024, css: 120 * 1024 };

if (entryBytes > limits.entry) throw new Error(`Initial JavaScript is ${(entryBytes / 1024).toFixed(1)} kB; budget is 300 kB.`);
if (cssBytes > limits.css) throw new Error(`CSS is ${(cssBytes / 1024).toFixed(1)} kB; budget is 120 kB.`);
console.log(`Bundle budgets pass: initial JS ${(entryBytes / 1024).toFixed(1)} kB / 300 kB; CSS ${(cssBytes / 1024).toFixed(1)} kB / 120 kB.`);
