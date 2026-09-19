import { useRef, useState } from 'react';
import type { Decision } from '../domain/types';
import {
  requestDecisionDraft,
  requestDecisionReview,
  type AiDraft,
  type AiProvider,
  type AiReview
} from '../lib/ai';

interface AiCoachProps {
  decision: Decision;
  onApplyDraft: (draft: AiDraft) => void;
}

const providerLabel: Record<AiProvider, string> = {
  gemini: 'Gemini 3.8 Flash',
  openrouter: 'OpenRouter free fallback'
};

export function AiCoach({ decision, onApplyDraft }: AiCoachProps) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [review, setReview] = useState<AiReview | null>(null);
  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [status, setStatus] = useState<'idle' | 'drafting' | 'reviewing'>('idle');
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  const runDraft = async () => {
    if (prompt.trim().length < 12) {
      setError('Describe the decision in at least 12 characters.');
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('drafting');
    setError('');

    try {
      const result = await requestDecisionDraft(prompt.trim(), controller.signal);
      setDraft(result.data);
      setProvider(result.provider);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : 'AI is temporarily unavailable.');
    } finally {
      if (!controller.signal.aborted) setStatus('idle');
    }
  };

  const runReview = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('reviewing');
    setError('');

    try {
      const result = await requestDecisionReview(decision, controller.signal);
      setReview(result.data);
      setProvider(result.provider);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : 'AI is temporarily unavailable.');
    } finally {
      if (!controller.signal.aborted) setStatus('idle');
    }
  };

  return (
    <section className="panel ai-panel" aria-labelledby="ai-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Optional AI coach</p>
          <h2 id="ai-heading">Structure or challenge — never decide</h2>
        </div>
        <span className="ai-badge">
          {provider ? providerLabel[provider] : 'Gemini → OpenRouter fallback'}
        </span>
      </div>

      <div className="ai-grid">
        <div className="ai-tool">
          <h3>Turn a messy problem into a frame</h3>
          <p>
            Describe a decision. AI suggests options, criteria and questions, but does not invent scores or
            select a winner.
          </p>
          <label htmlFor="ai-decision-prompt">Decision to structure</label>
          <textarea
            id="ai-decision-prompt"
            value={prompt}
            rows={5}
            maxLength={2500}
            placeholder="Example: I need to choose between three job offers. I care about growth, salary, flexibility, commute and family time..."
            onChange={(event) => setPrompt(event.target.value)}
          />
          <button
            className="button button--primary"
            type="button"
            disabled={status !== 'idle'}
            onClick={() => void runDraft()}
          >
            {status === 'drafting' ? 'Structuring…' : 'Structure with AI'}
          </button>

          {draft && (
            <div className="ai-result" aria-live="polite">
              <strong>{draft.title}</strong>
              <p>{draft.framing}</p>
              <h4>Suggested options</h4>
              <ul>
                {draft.options.map((option) => (
                  <li key={option.name}>
                    <strong>{option.name}:</strong> {option.rationale}
                  </li>
                ))}
              </ul>
              <h4>Suggested criteria</h4>
              <ul>
                {draft.criteria.map((criterion) => (
                  <li key={criterion.name}>
                    <strong>
                      {criterion.name} · {criterion.weight}%
                    </strong>{' '}
                    — {criterion.question}
                  </li>
                ))}
              </ul>
              {draft.cautions.length > 0 && (
                <>
                  <h4>Cautions</h4>
                  <ul>
                    {draft.cautions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <button className="button button--secondary" type="button" onClick={() => onApplyDraft(draft)}>
                Use this frame
              </button>
            </div>
          )}
        </div>

        <div className="ai-tool">
          <h3>Challenge the current matrix</h3>
          <p>
            AI sees a compact copy of the current matrix. It can surface blind spots, but the deterministic
            ranking remains authoritative.
          </p>
          <button
            className="button button--secondary"
            type="button"
            disabled={status !== 'idle'}
            onClick={() => void runReview()}
          >
            {status === 'reviewing' ? 'Reviewing…' : 'Challenge assumptions'}
          </button>

          {review && (
            <div className="ai-result" aria-live="polite">
              <p>{review.summary}</p>
              <h4>Blind spots</h4>
              <ul>
                {review.blindSpots.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h4>Questions worth answering</h4>
              <ul>
                {review.challengeQuestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {review.assumptions.length > 0 && (
                <>
                  <h4>Assumptions to verify</h4>
                  <ul>
                    {review.assumptions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <h4>Next evidence step</h4>
              <p>{review.nextStep}</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="ai-error" role="alert">
          {error} The local ranking, trade-off and sensitivity analysis still work normally.
        </p>
      )}
      <p className="ai-privacy">
        AI runs only after an explicit button press. Review requests send the visible framing, criteria,
        option labels, numeric scores and confidence values — not local score notes. Provider keys stay
        server-side.
      </p>
    </section>
  );
}
