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
  const metrics = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const describe = (element: Element) => {
      const node = element as HTMLElement;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const parent = node.parentElement;
      return {
        tag: node.tagName.toLowerCase(),
        id: node.id,
        className: typeof node.className === 'string' ? node.className : '',
        parent: parent
          ? `${parent.tagName.toLowerCase()}#${parent.id}.${typeof parent.className === 'string' ? parent.className : ''}`
          : '',
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        display: style.display,
        overflowX: style.overflowX,
        position: style.position
      };
    };

    const offenders = Array.from(document.querySelectorAll('body *'))
      .map(describe)
      .filter(
        (item) =>
          item.left < -1 ||
          item.right > clientWidth + 1 ||
          (item.scrollWidth > item.clientWidth + 1 && item.overflowX === 'visible')
      )
      .sort((a, b) => b.right - a.right)
      .slice(0, 24);

    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth,
      innerWidth: window.innerWidth,
      visualViewportWidth: Math.round(window.visualViewport?.width ?? 0),
      mobile580: window.matchMedia('(max-width: 580px)').matches,
      mobile800: window.matchMedia('(max-width: 800px)').matches,
      offenders
    };
  });

  expect(
    metrics.scrollWidth,
    `Page-level overflow diagnostics:\n${JSON.stringify(metrics, null, 2)}`
  ).toBeLessThanOrEqual(metrics.clientWidth + 1);
});

test('decision structure can be extended without breaking the matrix', async ({ page }) => {
  await page.locator('details.structure-editor > summary').click();
  await page.getByRole('button', { name: '+ Option' }).click();
  await page.getByRole('button', { name: '+ Criterion' }).click();

  await expect(page.getByText('5 options · 6 criteria')).toBeVisible();
  await page.getByLabel('Option name').last().fill('Pilot first');
  await page.getByLabel('Criterion name').last().fill('Reversibility');

  await expect(page.getByText('Pilot first', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Pilot first, Reversibility score')).toHaveValue('5');
});
