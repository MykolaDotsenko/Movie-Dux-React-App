import { z } from 'zod';
import type { Decision } from '../domain/types';

const providerSchema = z.enum(['gemini', 'openrouter']);

const draftSchema = z.object({
  title: z.string().min(1).max(100),
  framing: z.string().min(1).max(600),
  options: z
    .array(z.object({ name: z.string().min(1).max(70), rationale: z.string().max(180) }))
    .min(2)
    .max(8),
  criteria: z
    .array(
      z.object({
        name: z.string().min(1).max(70),
        weight: z.number().finite().min(1).max(100),
        question: z.string().max(220)
      })
    )
    .min(2)
    .max(8),
  cautions: z.array(z.string().max(260)).max(6)
});

const reviewSchema = z.object({
  summary: z.string().min(1).max(500),
  blindSpots: z.array(z.string().max(320)).max(6),
  challengeQuestions: z.array(z.string().max(320)).max(6),
  assumptions: z.array(z.string().max(320)).max(6),
  nextStep: z.string().min(1).max(420)
});

export type AiDraft = z.infer<typeof draftSchema>;
export type AiReview = z.infer<typeof reviewSchema>;
export type AiProvider = z.infer<typeof providerSchema>;

export interface AiResult<T> {
  data: T;
  provider: AiProvider;
}

async function postAi<T>(payload: unknown, schema: z.ZodType<T>, signal?: AbortSignal): Promise<AiResult<T>> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...(signal ? { signal } : {})
  });

  const raw: unknown = await response.json().catch(() => ({ error: 'AI returned an unreadable response.' }));

  if (!response.ok) {
    const error =
      typeof raw === 'object' && raw !== null && 'error' in raw && typeof raw.error === 'string'
        ? raw.error
        : 'AI is temporarily unavailable.';
    throw new Error(error);
  }

  const envelope = z.object({ provider: providerSchema, data: z.unknown() }).parse(raw);
  return { provider: envelope.provider, data: schema.parse(envelope.data) };
}

export function requestDecisionDraft(input: string, signal?: AbortSignal): Promise<AiResult<AiDraft>> {
  return postAi({ mode: 'draft', input }, draftSchema, signal);
}

export function requestDecisionReview(decision: Decision, signal?: AbortSignal): Promise<AiResult<AiReview>> {
  const compactDecision = {
    title: decision.title,
    framing: decision.framing,
    criteria: decision.criteria.map(({ id, name, weight, description }) => ({
      id,
      name,
      weight,
      description
    })),
    options: decision.options.map((option) => ({
      id: option.id,
      name: option.name,
      summary: option.summary,
      scores: Object.fromEntries(
        Object.entries(option.scores).map(([criterionId, score]) => [
          criterionId,
          { value: score.value, confidence: score.confidence }
        ])
      )
    })),
    scenarios: decision.scenarios,
    activeScenarioId: decision.activeScenarioId
  };

  return postAi({ mode: 'review', decision: compactDecision }, reviewSchema, signal);
}
