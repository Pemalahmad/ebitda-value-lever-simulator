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

async function shot(name, { width = 1600, height = 1000, hash = '', tab, full = false, action, selector } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: 'light' });
  await page.goto(url + hash);
  await page.addStyleTag({ content: '.toasts{display:none!important}' });
  await page.waitForTimeout(500);
  if (tab) await page.getByRole('tab', { name: tab }).click();
  if (action) await action(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  if (selector) await page.locator(selector).screenshot({ path: `${OUT}${name}.png` });
  else await page.screenshot({ path: `${OUT}${name}.png`, fullPage: full });
  await page.close();
  console.log('wrote', name);
}

const scenario = '#s=urbanServices&tab=value&utilisation=76&subShare=22&sla=1.8&dso=78&leadDays=32';
await shot('screenshot-portfolio', { hash: '#tab=portfolio&s=hospitality&occupancy=78&labourPOR=155', height: 1500, action: async (page) => {
  for (const name of ['Include REIT carve-out & capital recycling', 'Include Platform consolidation', 'Include Asset-light hospitality expansion']) await page.getByRole('button', { name }).click();
} });
await shot('screenshot-market', { height: 1400 });
await shot('screenshot-pulse', { height: 1400, tab: 'Live Market' });
await shot('screenshot-entry', { height: 1300, tab: 'Market Entry' });
await shot('screenshot-value', { hash: scenario, height: 1300 });
for (const [name, id] of [['screenshot-scorecard', '#vp-scorecard'], ['screenshot-business-case', '#vp-case'], ['screenshot-memo', '#vp-memo']]) {
  await shot(name, { hash: scenario, selector: id, height: 1300 });
}
await shot('screenshot-variance', { hash: scenario, selector: '#vp-drivers', height: 1300 });
await shot('screenshot-sensitivity', { hash: scenario, selector: '#vp-sens', height: 1300 });
await shot('screenshot-consolidation', { hash: '#tab=portfolio', selector: '#pl-ic', height: 1400, action: async (page) => { await page.getByRole('button', { name: 'Load typical flows' }).click(); await page.waitForTimeout(300); } });
await shot('screenshot-newco', { hash: '#tab=portfolio', selector: '#pl-newco', height: 1500 });
await shot('screenshot-checks', { height: 1000, action: async (page) => { await page.locator('.checks-btn').click(); await page.getByRole('tab', { name: /Missing data/ }).click(); await page.waitForTimeout(300); } });
await shot('screenshot-mobile', { width: 390, height: 844, hash: '#s=hospitality&occupancy=79&labourPOR=152' });
await shot('screenshot-dark', { height: 1400, action: async (page) => {
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
} });
await shot('screenshot-scenarios', { selector: '.scenario-workspace', action: async (page) => {
  const lightMode = page.getByRole('button', { name: 'Switch to light mode' });
  if (await lightMode.isVisible()) await lightMode.click();
  await page.getByRole('option', { name: /Growth/ }).click();
  await page.getByRole('button', { name: /Open comparison Growth/ }).click();
  await page.waitForTimeout(850);
} });
await shot('screenshot-import-lab', { selector: '.import-lab', action: async (page) => {
  const lightMode = page.getByRole('button', { name: 'Switch to light mode' });
  if (await lightMode.isVisible()) await lightMode.click();
  await page.locator('#dld-import-file').setInputFiles('tests/fixtures/dld-synthetic.csv');
  await page.getByText('Validation passed').waitFor({ state: 'visible' });
} });

if (process.argv.includes('--gif')) {
  const frames = '/tmp/evls-frames';
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
  await page.goto(url);
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
  await frame(8); // Market tracker landing
  await page.getByRole('tab', { name: 'Live Market' }).click();
  await page.waitForTimeout(400);
  await frame(4);
  for (const m of ['VIX', 'Gold']) { await page.locator('.kpi', { hasText: m }).first().click(); await page.waitForTimeout(200); await frame(4); }
  await page.getByRole('tab', { name: 'Value Plan' }).click();
  await page.getByLabel('Business').selectOption('urbanServices');
  await page.waitForTimeout(300);
  await frame(4);
  await slide('utilisation', 76, 8);
  await slide('subShare', 22, 6);
  await slide('dso', 76, 6);
  await frame(6);
  await page.getByRole('button', { name: 'Play' }).first().click();
  await page.waitForTimeout(250);
  await frame(4);
  for (const id of ['vp-drivers', 'vp-scorecard', 'vp-case', 'vp-memo']) {
    await page.evaluate((x) => { const el = document.getElementById(x); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120); }, id);
    await page.waitForTimeout(250);
    await frame(6);
  }
  await page.getByRole('tab', { name: 'Portfolio Lab' }).click();
  await page.waitForTimeout(300);
  await frame(4);
  for (let i = 0; i < 14; i++) { await page.mouse.move(420 + i * 40, 520 + Math.sin(i / 2) * 60); await page.waitForTimeout(40); await frame(); }
  for (const name of ['Include REIT carve-out & capital recycling', 'Include Platform consolidation']) { await page.getByRole('button', { name }).click(); await page.waitForTimeout(200); await frame(3); }
  await page.locator('.kpi', { hasText: 'Scenario value' }).click();
  await page.waitForTimeout(250);
  await frame(8);
  await page.getByRole('tab', { name: 'Market Entry' }).click();
  await page.waitForTimeout(300);
  await frame(8);
  await page.close();
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '6', '-i', `${frames}/f%04d.png`,
    '-vf', 'scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    `${OUT}demo.gif`], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  console.log('wrote demo.gif from', n, 'frames');
}

await browser.close();
server.close();
