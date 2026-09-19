import type { Decision, DecisionOption, Criterion } from './types';

export interface FrameCriterion {
  name: string;
  weight: number;
  description: string;
}

export interface FrameOption {
  name: string;
  summary: string;
}

export interface DecisionFrame {
  title: string;
  framing: string;
  criteria: FrameCriterion[];
  options: FrameOption[];
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 36);
}

function uniqueId(prefix: string, label: string, index: number, used: Set<string>): string {
  const base = `${prefix}-${slug(label) || index + 1}`;
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

export function createDecisionFromFrame(
  frame: DecisionFrame,
  clock: () => string = () => new Date().toISOString()
): Decision {
  const criterionIds = new Set<string>();
  const criteria: Criterion[] = frame.criteria.map((criterion, index) => ({
    id: uniqueId('criterion', criterion.name, index, criterionIds),
    name: criterion.name.trim() || `Criterion ${index + 1}`,
    weight: Math.max(0, criterion.weight),
    description: criterion.description.trim()
  }));

  const optionIds = new Set<string>();
  const options: DecisionOption[] = frame.options.map((option, index) => {
    const id = uniqueId('option', option.name, index, optionIds);
    return {
      id,
      name: option.name.trim() || `Option ${index + 1}`,
      summary: option.summary.trim(),
      scores: Object.fromEntries(
        criteria.map((criterion) => [
          criterion.id,
          {
            value: 5,
            confidence: 'medium' as const,
            note: 'Add your own evidence before relying on this score.'
          }
        ])
      )
    };
  });

  const weights = Object.fromEntries(criteria.map((criterion) => [criterion.id, criterion.weight]));
  const timestamp = clock();

  return {
    schemaVersion: 1,
    id: `decision-${slug(frame.title) || 'untitled'}`,
    title: frame.title.trim() || 'Untitled decision',
    framing: frame.framing.trim(),
    criteria,
    options,
    scenarios: [{ id: 'balanced', name: 'Balanced', weights }],
    activeScenarioId: 'balanced',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function createBlankDecision(): Decision {
  return createDecisionFromFrame({
    title: 'Untitled decision',
    framing: 'Describe what you are deciding and what a good outcome means.',
    options: [
      { name: 'Option A', summary: 'Describe this option.' },
      { name: 'Option B', summary: 'Describe this option.' }
    ],
    criteria: [
      { name: 'Value', weight: 40, description: 'How much useful value does this option create?' },
      { name: 'Cost', weight: 30, description: 'How favorable is the total cost or effort?' },
      { name: 'Risk', weight: 30, description: 'How manageable are uncertainty and downside?' }
    ]
  });
}
