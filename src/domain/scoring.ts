import type { Criterion, Decision, RankedOption, SensitivityFinding } from './types';

const confidenceFactor = {
  low: 0.55,
  medium: 0.78,
  high: 1
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeWeights(
  criteria: Criterion[],
  rawWeights: Record<string, number>
): Record<string, number> {
  if (criteria.length === 0) return {};

  const cleaned = Object.fromEntries(
    criteria.map((criterion) => {
      const candidate = rawWeights[criterion.id];
      const weight =
        typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : criterion.weight;
      return [criterion.id, Math.max(0, weight)] as const;
    })
  );

  const total = Object.values(cleaned).reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    const equal = 100 / criteria.length;
    return Object.fromEntries(criteria.map((criterion) => [criterion.id, equal]));
  }

  return Object.fromEntries(
    criteria.map((criterion) => [criterion.id, (cleaned[criterion.id]! / total) * 100])
  );
}

export function activeWeights(decision: Decision): Record<string, number> {
  const activeScenario = decision.scenarios.find((scenario) => scenario.id === decision.activeScenarioId);

  const raw =
    activeScenario?.weights ??
    Object.fromEntries(decision.criteria.map((criterion) => [criterion.id, criterion.weight]));

  return normalizeWeights(decision.criteria, raw);
}

export function rankOptions(decision: Decision, overrideWeights?: Record<string, number>): RankedOption[] {
  const weights = normalizeWeights(decision.criteria, overrideWeights ?? activeWeights(decision));

  return decision.options
    .map((option) => {
      let weightedScore = 0;
      let weightedConfidence = 0;
      const contributions: Record<string, number> = {};

      for (const criterion of decision.criteria) {
        const cell = option.scores[criterion.id];
        if (!cell) continue;

        const normalizedWeight = weights[criterion.id] ?? 0;
        const contribution = (clamp(cell.value, 0, 10) / 10) * normalizedWeight;

        contributions[criterion.id] = contribution;
        weightedScore += contribution;
        weightedConfidence += normalizedWeight * confidenceFactor[cell.confidence];
      }

      return {
        optionId: option.id,
        name: option.name,
        score: Number(weightedScore.toFixed(2)),
        confidence: Number(weightedConfidence.toFixed(1)),
        contributions
      };
    })
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
}

function weightsWithCriterionAt(
  decision: Decision,
  criterionId: string,
  targetWeight: number
): Record<string, number> {
  const base = activeWeights(decision);
  const current = base[criterionId] ?? 0;
  const target = clamp(targetWeight, 5, 95);
  const otherTotal = Math.max(0, 100 - current);
  const newOtherTotal = 100 - target;

  if (otherTotal <= 0) {
    const others = decision.criteria.filter((criterion) => criterion.id !== criterionId);
    const equalOther = others.length > 0 ? newOtherTotal / others.length : 0;
    return Object.fromEntries(
      decision.criteria.map((criterion) => [criterion.id, criterion.id === criterionId ? target : equalOther])
    );
  }

  return Object.fromEntries(
    decision.criteria.map((criterion) => {
      if (criterion.id === criterionId) return [criterion.id, target] as const;
      const weight = base[criterion.id] ?? 0;
      return [criterion.id, (weight / otherTotal) * newOtherTotal] as const;
    })
  );
}

export function findSensitivity(decision: Decision): SensitivityFinding | null {
  const baseline = rankOptions(decision);
  const leader = baseline[0];

  if (!leader || decision.criteria.length < 2 || decision.options.length < 2) {
    return null;
  }

  const base = activeWeights(decision);
  let best: SensitivityFinding | null = null;

  for (const criterion of decision.criteria) {
    const originalWeight = base[criterion.id] ?? 0;

    for (let delta = 1; delta <= 40; delta += 1) {
      for (const direction of [-1, 1] as const) {
        const target = originalWeight + delta * direction;
        if (target < 5 || target > 95) continue;

        const ranking = rankOptions(decision, weightsWithCriterionAt(decision, criterion.id, target));
        const nextLeader = ranking[0];

        if (!nextLeader || nextLeader.optionId === leader.optionId) continue;

        const finding: SensitivityFinding = {
          criterionId: criterion.id,
          criterionName: criterion.name,
          originalWeight: Number(originalWeight.toFixed(1)),
          flipWeight: Number(target.toFixed(1)),
          delta,
          newLeaderId: nextLeader.optionId,
          newLeaderName: nextLeader.name
        };

        if (!best || finding.delta < best.delta) best = finding;
        break;
      }

      if (best?.criterionId === criterion.id && best.delta === delta) break;
    }
  }

  return best;
}

export interface TradeoffInsight {
  criterionId: string;
  criterionName: string;
  delta: number;
  leaderContribution: number;
  runnerUpContribution: number;
}

export function topTradeoffs(decision: Decision, limit = 3): TradeoffInsight[] {
  const ranking = rankOptions(decision);
  const leader = ranking[0];
  const runnerUp = ranking[1];

  if (!leader || !runnerUp) return [];

  return decision.criteria
    .map((criterion) => {
      const leaderContribution = leader.contributions[criterion.id] ?? 0;
      const runnerUpContribution = runnerUp.contributions[criterion.id] ?? 0;
      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        delta: Number((leaderContribution - runnerUpContribution).toFixed(2)),
        leaderContribution: Number(leaderContribution.toFixed(2)),
        runnerUpContribution: Number(runnerUpContribution.toFixed(2))
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, limit);
}
