// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { GET } from '../api/health.js';

describe('health endpoint', () => {
  it('returns a minimal no-store health response without exposing environment details', async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(payload).toEqual({
      status: 'ok',
      service: 'tradeoff-decision-lab'
    });
    expect(JSON.stringify(payload)).not.toMatch(/key|secret|token|provider/i);
  });
});
