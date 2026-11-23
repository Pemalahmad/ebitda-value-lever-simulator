// Capture README screenshots and the demo GIF from the built app.
//   npm run build && node scripts/capture.mjs [--gif]
// Needs Playwright: `npm i -D playwright` (or set PLAYWRIGHT_PATH to an existing install).
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { createServer } from '../server/index.js';

const pw = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const { chromium } = pw.default ?? pw;
const OUT = new URL('../docs/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const server = createServer();
await new Promise((ok) => server.listen(0, ok));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--force-color-profile=srgb'] });

async function shot(name, { width = 1600, height = 1000, hash = '', tab, full = false, action } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto(url + hash);
  await page.addStyleTag({ content: '.toasts{display:none!important}' });
  await page.waitForTimeout(500);
  if (tab) await page.getByRole('tab', { name: tab }).click();
  if (action) await action(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: full });
  await page.close();
  console.log('wrote', name);
}

const scenario = '#s=urbanServices&tab=simulator&utilisation=76&subShare=22&sla=1.8&dso=78&leadDays=32';
await shot('screenshot-group', { hash: '#s=hospitality&occupancy=78&labourPOR=155', height: 1500, action: async (page) => {
  for (const name of ['Include REIT carve-out & capital recycling', 'Include Platform consolidation', 'Include Asset-light hospitality expansion']) await page.getByRole('button', { name }).click();
} });
await shot('screenshot-market', { hash: '#tab=market', height: 1400 });
await shot('screenshot-simulator', { hash: scenario });
await shot('screenshot-scorecard', { hash: scenario, tab: 'Balanced Scorecard' });
await shot('screenshot-business-case', { hash: scenario, tab: 'Business Case' });
await shot('screenshot-memo', { hash: scenario, tab: 'Board Memo', height: 1300 });
await shot('screenshot-mobile', { width: 390, height: 844, hash: '#s=hospitality&occupancy=79&labourPOR=152' });

if (process.argv.includes('--gif')) {
  const frames = '/tmp/evls-frames';
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(url + '#s=realEstate');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  let n = 0;
  const frame = async (hold = 1) => { for (let i = 0; i < hold; i++) await page.screenshot({ path: `${frames}/f${String(n++).padStart(4, '0')}.png` }); };
  const slide = async (id, to, steps = 6) => {
    const el = page.locator(`#lv-${id}`);
    const from = Number(await el.inputValue());
    for (let i = 1; i <= steps; i++) {
      const v = from + ((to - from) * i) / steps;
      await el.evaluate((node, val) => {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        set.call(node, String(val));
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }, v);
      await page.waitForTimeout(60);
      await frame();
    }
  };
  await frame(8); // Group & Funds landing
  await page.getByRole('button', { name: 'Model it' }).nth(2).click(); // Dubai Residential REIT IPO preset
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await frame(8);
  await page.getByRole('button', { name: /Integrated Urban Services/ }).click();
  await page.getByRole('tab', { name: 'Value Simulator' }).click();
  await page.waitForTimeout(300);
  await frame(5);
  await slide('utilisation', 76, 8);
  await frame(4);
  await slide('subShare', 22, 6);
  await slide('dso', 76, 6);
  await frame(10); // let the mission toast show
  await page.getByRole('button', { name: 'Play' }).first().click();
  await page.waitForTimeout(250);
  await frame(6);
  await page.getByRole('tab', { name: 'Balanced Scorecard' }).click();
  await page.waitForTimeout(300);
  await frame(8);
  await page.getByRole('tab', { name: 'Business Case' }).click();
  await page.waitForTimeout(300);
  await frame(8);
  await page.getByRole('tab', { name: 'Board Memo' }).click();
  await page.waitForTimeout(300);
  await frame(6);
  for (let y = 0; y < 4; y++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(80); await frame(2); }
  await page.getByRole('tab', { name: 'Market Tracker' }).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await frame(8);
  for (let y = 0; y < 3; y++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(80); await frame(2); }
  await frame(6);
  await page.close();
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '6', '-i', `${frames}/f%04d.png`,
    '-vf', 'scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    `${OUT}demo.gif`], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  console.log('wrote demo.gif from', n, 'frames');
}

await browser.close();
server.close();
