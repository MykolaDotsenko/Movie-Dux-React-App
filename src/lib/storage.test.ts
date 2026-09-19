import { beforeEach, describe, expect, it } from 'vitest';
import { sampleDecision } from '../domain/sample';
import { exportDecision, importDecision, loadDecision, saveDecision } from './storage';

describe('decision persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips a valid decision export', () => {
    const encoded = exportDecision(sampleDecision);
    expect(importDecision(encoded)).toEqual(sampleDecision);
  });

  it('falls back when stored JSON is corrupt', () => {
    window.localStorage.setItem('tradeoff:decision:v1', '{nope');
    expect(loadDecision(sampleDecision)).toEqual(sampleDecision);
  });

  it('persists valid state', () => {
    expect(saveDecision(sampleDecision)).toBe(true);
    expect(loadDecision({ ...sampleDecision, title: 'fallback' }).title).toBe(sampleDecision.title);
  });
  it('rejects state with a missing score cell', () => {
    const broken = structuredClone(sampleDecision);
    delete broken.options[0]!.scores[broken.criteria[0]!.id];
    expect(() => importDecision(JSON.stringify(broken))).toThrow();
  });

  it('rejects a missing active scenario reference', () => {
    const broken = structuredClone(sampleDecision);
    broken.activeScenarioId = 'missing-scenario';
    expect(() => importDecision(JSON.stringify(broken))).toThrow();
  });
});
