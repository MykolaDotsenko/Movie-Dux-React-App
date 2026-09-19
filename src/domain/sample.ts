import type { Confidence, Decision, ScoreCell } from './types';

function cell(value: number, confidence: Confidence, note: string): ScoreCell {
  return { value, confidence, note };
}

const createdAt = '2026-09-19T12:00:00.000Z';

export const sampleDecision: Decision = {
  schemaVersion: 1,
  id: 'portfolio-next',
  title: 'Choose the next portfolio project',
  framing:
    'Pick the next project that creates the strongest new recruiter signal without duplicating the current portfolio.',
  criteria: [
    {
      id: 'value',
      name: 'Real user value',
      weight: 24,
      description: 'Does the product solve a recognizable problem rather than demonstrate a feature?'
    },
    {
      id: 'depth',
      name: 'Technical depth',
      weight: 24,
      description: 'How much meaningful frontend/domain engineering can the project demonstrate?'
    },
    {
      id: 'distinct',
      name: 'Portfolio differentiation',
      weight: 22,
      description: 'Does this add a new signal rather than duplicate existing projects?'
    },
    {
      id: 'finish',
      name: 'Finishability',
      weight: 16,
      description:
        'Can the product reach a polished, testable scope without becoming a never-ending platform?'
    },
    {
      id: 'story',
      name: 'Recruiter story',
      weight: 14,
      description: 'Is the product easy to understand and discuss in an interview?'
    }
  ],
  options: [
    {
      id: 'decision-lab',
      name: 'Decision Lab',
      summary: 'Explainable multi-criteria trade-off analysis with scenarios and sensitivity.',
      scores: {
        value: cell(9, 'high', 'Useful for purchases, relocation, job offers and planning.'),
        depth: cell(9, 'high', 'Algorithms, local-first state, visualization and accessibility.'),
        distinct: cell(10, 'high', 'Very different from current catalog and CRUD projects.'),
        finish: cell(8, 'medium', 'Rich but bounded when analysis stays deterministic.'),
        story: cell(10, 'high', 'The problem and engineering trade-offs are easy to explain.')
      }
    },
    {
      id: 'data-atlas',
      name: 'Data Atlas',
      summary: 'Interactive local dataset explorer with filtering, facets and visual summaries.',
      scores: {
        value: cell(8, 'medium', 'Useful when paired with a compelling dataset.'),
        depth: cell(9, 'high', 'Filtering, performance and visualization can be sophisticated.'),
        distinct: cell(8, 'medium', 'Adds a data-product signal but can resemble dashboards.'),
        finish: cell(7, 'medium', 'Dataset sourcing and visualization scope can expand quickly.'),
        story: cell(8, 'high', 'Clear engineering story with the right domain.')
      }
    },
    {
      id: 'developer-utility',
      name: 'Developer Utility',
      summary: 'A precise browser tool for transforming and validating structured developer data.',
      scores: {
        value: cell(8, 'high', 'Can solve a frequent workflow pain point.'),
        depth: cell(8, 'high', 'Parsing, validation, workers and shareable state are strong signals.'),
        distinct: cell(7, 'medium', 'Developer tools are common in portfolios.'),
        finish: cell(10, 'high', 'Easy to scope tightly and make exceptionally polished.'),
        story: cell(8, 'high', 'Simple to demo and explain.')
      }
    },
    {
      id: 'api-explorer',
      name: 'API Explorer',
      summary: 'A resilient external-data experience with caching, search and offline fallback.',
      scores: {
        value: cell(7, 'medium', 'Value depends heavily on the selected upstream API.'),
        depth: cell(8, 'high', 'Caching, request orchestration and resilience are useful signals.'),
        distinct: cell(5, 'high', 'The portfolio already contains several API-backed discovery apps.'),
        finish: cell(8, 'medium', 'External API availability adds delivery risk.'),
        story: cell(7, 'high', 'Easy to explain but less original.')
      }
    }
  ],
  scenarios: [
    {
      id: 'balanced',
      name: 'Balanced',
      weights: { value: 24, depth: 24, distinct: 22, finish: 16, story: 14 }
    },
    {
      id: 'recruiter',
      name: 'Recruiter impact',
      weights: { value: 18, depth: 30, distinct: 28, finish: 8, story: 16 }
    },
    {
      id: 'pragmatic',
      name: 'Pragmatic',
      weights: { value: 24, depth: 18, distinct: 14, finish: 30, story: 14 }
    }
  ],
  activeScenarioId: 'balanced',
  createdAt,
  updatedAt: createdAt
};
