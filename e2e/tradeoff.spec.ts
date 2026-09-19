import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('core decision workspace is usable and persistent', async ({ page }) => {
  const title = page.getByLabel('Decision title');
  await expect(title).toHaveValue('Choose the next portfolio project');
  await expect(page.getByText('Decision Lab', { exact: true }).first()).toBeVisible();

  const firstScore = page.getByLabel('Decision Lab, Real user value score');
  await firstScore.fill('2');
  await expect(firstScore).toHaveValue('2');

  await page.reload();
  await expect(page.getByLabel('Decision Lab, Real user value score')).toHaveValue('2');
});

test('scenario switching updates the active state without changing evidence', async ({ page }) => {
  const score = page.getByLabel('Decision Lab, Technical depth score');
  await expect(score).toHaveValue('9');

  await page.getByRole('button', { name: 'Recruiter impact' }).click();
  await expect(page.getByRole('button', { name: 'Recruiter impact' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(score).toHaveValue('9');
});

test('main state is free of automated accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('mobile layout does not create page-level horizontal overflow', async ({ page }) => {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
});

test('decision structure can be extended without breaking the matrix', async ({ page }) => {
  await page.locator('details.structure-editor > summary').click();
  await page.getByRole('button', { name: '+ Option' }).click();
  await page.getByRole('button', { name: '+ Criterion' }).click();

  await expect(page.getByText('4 options · 5 criteria')).toBeVisible();
  await page.getByLabel('Option name').last().fill('Pilot first');
  await page.getByLabel('Criterion name').last().fill('Reversibility');

  await expect(page.getByText('Pilot first', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Pilot first, Reversibility score')).toHaveValue('5');
});
