import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const rawUrl = process.argv[2] ?? process.env.PRODUCTION_URL ?? 'https://tradeoff-decision-lab.vercel.app';
const baseUrl = new URL(rawUrl);
baseUrl.pathname = '/';
baseUrl.search = '';
baseUrl.hash = '';

const outputDir = 'docs/screenshots';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();

async function settle(page) {
  await page.goto(baseUrl.href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await settle(desktop);

  await desktop.screenshot({
    path: `${outputDir}/tradeoff-overview-desktop.png`,
    animations: 'disabled'
  });

  const matrix = desktop.locator('.matrix-panel');
  await matrix.scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(200);
  await matrix.screenshot({
    path: `${outputDir}/tradeoff-evidence-matrix-desktop.png`,
    animations: 'disabled'
  });

  const aiPanel = desktop.locator('.ai-panel');
  await aiPanel.scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(200);
  await aiPanel.screenshot({
    path: `${outputDir}/tradeoff-ai-copilot-desktop.png`,
    animations: 'disabled'
  });

  await desktop.close();

  const mobile = await browser.newPage({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true
  });
  await settle(mobile);

  await mobile.screenshot({
    path: `${outputDir}/tradeoff-overview-mobile.png`,
    animations: 'disabled'
  });

  const mobileMatrix = mobile.locator('.matrix-panel');
  await mobileMatrix.scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(200);
  await mobileMatrix.screenshot({
    path: `${outputDir}/tradeoff-evidence-matrix-mobile.png`,
    animations: 'disabled'
  });

  await mobile.close();

  console.log(
    JSON.stringify(
      {
        production: baseUrl.origin,
        screenshots: [
          'tradeoff-overview-desktop.png',
          'tradeoff-evidence-matrix-desktop.png',
          'tradeoff-ai-copilot-desktop.png',
          'tradeoff-overview-mobile.png',
          'tradeoff-evidence-matrix-mobile.png'
        ]
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
