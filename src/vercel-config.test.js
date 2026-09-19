// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

describe('Vercel production configuration', () => {
  it('keeps request cancellation enabled for API functions', () => {
    expect(config.functions?.['api/*']?.supportsCancellation).toBe(true);
  });

  it('applies baseline security headers to every route', () => {
    const globalRule = config.headers?.find((rule) => rule.source === '/(.*)');
    const headers = Object.fromEntries((globalRule?.headers ?? []).map(({ key, value }) => [key, value]));

    expect(headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    });
  });
});
