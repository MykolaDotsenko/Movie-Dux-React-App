import { describe, expect, it } from 'vitest';
import { sampleDecision } from './sample';
import { findSensitivity, normalizeWeights, rankOptions } from './scoring';

describe('decision scoring', () => {
  it('normalizes weights to 100', () => {
    const weights = normalizeWeights(sampleDecision.criteria, { value: 5, depth: 5 });
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(100, 8);
  });

  it('ranks deterministically without folding confidence into the score', () => {
    const first = rankOptions(sampleDecision);
    const second = rankOptions(sampleDecision);
    expect(first).toEqual(second);
    expect(first[0]?.name).toBe('Decision Lab');
    expect(first[0]?.score).toBeGreaterThan(first[1]?.score ?? 0);
  });

  it('never uses confidence to break score ties', () => {
    const tied = structuredClone(sampleDecision);
    for (const option of tied.options) {
      for (const cell of Object.values(option.scores)) {
        cell.value = 5;
        cell.confidence = option.name === 'Decision Lab' ? 'low' : 'high';
      }
    }

    const ranking = rankOptions(tied);
    expect(ranking.map((option) => option.name)).toEqual(
      [...ranking.map((option) => option.name)].sort((a, b) => a.localeCompare(b))
    );
  });

  it('returns confidence as a separate evidence-quality signal', () => {
    const ranking = rankOptions(sampleDecision);
    expect(ranking[0]?.confidence).toBeGreaterThan(80);
    expect(ranking.every((option) => option.confidence <= 100)).toBe(true);
  });

  it('can inspect sensitivity without mutating the decision', () => {
    const before = JSON.stringify(sampleDecision);
    const finding = findSensitivity(sampleDecision);
    expect(JSON.stringify(sampleDecision)).toBe(before);
    expect(finding === null || finding.delta > 0).toBe(true);
  });
});
