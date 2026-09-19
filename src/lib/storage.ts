import { z } from 'zod';
import type { Decision } from '../domain/types';

const STORAGE_KEY = 'tradeoff:decision:v1';

let persistenceHealthy = true;
const persistenceListeners = new Set<() => void>();

function setPersistenceHealth(next: boolean): void {
  if (persistenceHealthy === next) return;
  persistenceHealthy = next;
  for (const listener of persistenceListeners) listener();
}

export function subscribePersistenceHealth(listener: () => void): () => void {
  persistenceListeners.add(listener);
  return () => persistenceListeners.delete(listener);
}

export function getPersistenceHealth(): boolean {
  return persistenceHealthy;
}

const confidenceSchema = z.enum(['low', 'medium', 'high']);

const scoreCellSchema = z.object({
  value: z.number().finite().min(0).max(10),
  confidence: confidenceSchema,
  note: z.string().max(500)
});

const criterionSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
  weight: z.number().finite().min(0).max(100),
  description: z.string().max(300)
});

const optionSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
  summary: z.string().max(300),
  scores: z.record(z.string(), scoreCellSchema)
});

const scenarioSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
  weights: z.record(z.string(), z.number().finite().min(0).max(100))
});

export const decisionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(120),
    title: z.string().min(1).max(120),
    framing: z.string().max(500),
    criteria: z.array(criterionSchema).min(2).max(8),
    options: z.array(optionSchema).min(2).max(8),
    scenarios: z.array(scenarioSchema).min(1).max(8),
    activeScenarioId: z.string().min(1).max(100),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .superRefine((decision, context) => {
    const criterionIds = new Set(decision.criteria.map((criterion) => criterion.id));
    const optionIds = new Set(decision.options.map((option) => option.id));
    const scenarioIds = new Set(decision.scenarios.map((scenario) => scenario.id));

    if (criterionIds.size !== decision.criteria.length) {
      context.addIssue({ code: 'custom', path: ['criteria'], message: 'Criterion IDs must be unique.' });
    }
    if (optionIds.size !== decision.options.length) {
      context.addIssue({ code: 'custom', path: ['options'], message: 'Option IDs must be unique.' });
    }
    if (scenarioIds.size !== decision.scenarios.length) {
      context.addIssue({ code: 'custom', path: ['scenarios'], message: 'Scenario IDs must be unique.' });
    }
    if (!scenarioIds.has(decision.activeScenarioId)) {
      context.addIssue({
        code: 'custom',
        path: ['activeScenarioId'],
        message: 'Active scenario must exist.'
      });
    }

    for (const [optionIndex, option] of decision.options.entries()) {
      for (const criterion of decision.criteria) {
        if (!option.scores[criterion.id]) {
          context.addIssue({
            code: 'custom',
            path: ['options', optionIndex, 'scores', criterion.id],
            message: 'Every option must contain a score for every criterion.'
          });
        }
      }
    }

    for (const [scenarioIndex, scenario] of decision.scenarios.entries()) {
      for (const criterion of decision.criteria) {
        if (scenario.weights[criterion.id] === undefined) {
          context.addIssue({
            code: 'custom',
            path: ['scenarios', scenarioIndex, 'weights', criterion.id],
            message: 'Every scenario must contain a weight for every criterion.'
          });
        }
      }
    }
  });

export function loadDecision(fallback: Decision): Decision {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setPersistenceHealth(true);
    if (!raw) return fallback;
    const parsed = decisionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    setPersistenceHealth(false);
    return fallback;
  }
}

export function saveDecision(decision: Decision): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decision));
    setPersistenceHealth(true);
    return true;
  } catch {
    setPersistenceHealth(false);
    return false;
  }
}

export function exportDecision(decision: Decision): string {
  return JSON.stringify(decision, null, 2);
}

export function importDecision(raw: string): Decision {
  return decisionSchema.parse(JSON.parse(raw));
}
