import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const workspaces = ['Daily Command', 'Regional Intel', 'Live Market', 'Market Tracker', 'Market Entry', 'Value Plan', 'Portfolio Lab'];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.decision-app').waitFor();
});

test('all workspaces keep the same content geometry', async ({ page }) => {
  const boxes = [];
  for (const name of workspaces) {
    await page.getByRole('tab', { name }).click();
    await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    await page.locator('.decision-layout .center > *').first().waitFor();
    boxes.push(await page.locator('.decision-layout').boundingBox());
  }
  for (const box of boxes.slice(1)) {
    expect(Math.abs(box.x - boxes[0].x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(1);
  }
});

test('mobile deep links keep the active workspace visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#s=realEstate&tab=value');
  await page.reload();
  const active = page.getByRole('tab', { name: 'Value Plan' });
  await expect(active).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => {
    const [tab, nav] = await Promise.all([active.boundingBox(), page.getByRole('tablist', { name: 'Decision workspaces' }).boundingBox()]);
    return tab.x >= nav.x - 1 && tab.x + tab.width <= nav.x + nav.width + 1;
  }).toBe(true);
});

test('portfolio has no page-level horizontal overflow', async ({ page }) => {
  await page.getByRole('tab', { name: 'Portfolio Lab' }).click();
  await page.locator('.doc').waitFor();
  const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
});

test('scenario controls behave as an accessible modal drawer', async ({ page }) => {
  await page.getByRole('tab', { name: 'Value Plan' }).click();
  await page.getByRole('button', { name: 'Adjust scenario' }).click();
  const dialog = page.getByRole('dialog', { name: 'Scenario controls' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('theme and workspace state survive reload; export creates a portable file', async ({ page }) => {
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  expect((await download).suggestedFilename()).toMatch(/uae-decision-atlas-\d{4}-\d{2}-\d{2}\.json/);
});

test('daily command creates, escalates and persists owned actions', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Today’s operating picture' })).toBeVisible();
  await page.getByRole('button', { name: 'Create action' }).click();
  const form = page.locator('.action-form');
  await form.getByRole('textbox', { name: 'Action', exact: true }).fill('Prepare the Monday operating pack');
  await form.getByLabel('Owner').fill('Strategy office');
  await form.getByLabel('Value, AEDm').fill('14');
  await form.getByLabel('Workspace').selectOption('portfolio');
  await form.getByLabel('Priority').selectOption('high');
  await form.getByRole('button', { name: 'Save action' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Prepare the Monday operating pack' });
  await expect(row).toContainText('Strategy office');
  await row.getByRole('button', { name: 'Escalate' }).click();
  await expect(page.getByText('Saved locally')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: 'Prepare the Monday operating pack' })).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByPlaceholder('Actions, decisions, markets…')).toBeFocused();
});

test('named decision cases persist and can be compared', async ({ page }) => {
  await page.getByRole('button', { name: /Cases/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Saved cases' });
  await expect(dialog).toBeVisible();
  await page.getByLabel('Case name').fill('Investment committee base');
  await page.getByRole('button', { name: 'Save current' }).click();
  await expect(dialog.locator('.case-list b', { hasText: 'Investment committee base' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close saved cases' }).click();
  await page.reload();
  await page.getByRole('button', { name: /Cases/ }).click();
  await expect(page.getByRole('dialog', { name: 'Saved cases' }).locator('.case-list b', { hasText: 'Investment committee base' })).toBeVisible();
});

test('core shell has no serious or critical accessibility violations', async ({ page }) => {
  for (const name of ['Daily Command', 'Regional Intel', 'Value Plan', 'Market Entry']) {
    await page.getByRole('tab', { name }).click();
    await page.locator('.doc').waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const severe = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    expect(severe, severe.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  }
});

test('regional intelligence visual contract', async ({ page }) => {
  await page.getByRole('tab', { name: 'Regional Intel' }).click();
  await expect(page.locator('.regional-view')).toHaveScreenshot('regional-intelligence.png');
});
