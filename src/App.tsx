import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AiCoach } from './components/AiCoach';
import { CriteriaPanel } from './components/CriteriaPanel';
import { DecisionHero } from './components/DecisionHero';
import { DecisionMatrix } from './components/DecisionMatrix';
import { InsightsPanel } from './components/InsightsPanel';
import { ScenarioBar } from './components/ScenarioBar';
import { StructureEditor } from './components/StructureEditor';
import { TopBar } from './components/TopBar';
import { createBlankDecision, createDecisionFromFrame } from './domain/factory';
import { sampleDecision } from './domain/sample';
import { activeWeights, findSensitivity, rankOptions, topTradeoffs } from './domain/scoring';
import type { Confidence, Decision } from './domain/types';
import type { AiDraft } from './lib/ai';
import {
  exportDecision,
  getPersistenceHealth,
  importDecision,
  loadDecision,
  saveDecision,
  subscribePersistenceHealth
} from './lib/storage';

function now(): string {
  return new Date().toISOString();
}

function sanitizeNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function entityId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export default function App() {
  const [decision, setDecision] = useState<Decision>(() => loadDecision(sampleDecision));
  const persistenceHealthy = useSyncExternalStore(
    subscribePersistenceHealth,
    getPersistenceHealth,
    getPersistenceHealth
  );
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveDecision(decision);
  }, [decision]);

  const ranking = useMemo(() => rankOptions(decision), [decision]);
  const sensitivity = useMemo(() => findSensitivity(decision), [decision]);
  const tradeoffs = useMemo(() => topTradeoffs(decision), [decision]);

  const updateDecision = (updater: (current: Decision) => Decision) => {
    setDecision((current) => ({ ...updater(current), updatedAt: now() }));
  };

  const updateActiveScenarioWeight = (criterionId: string, targetWeight: number) => {
    updateDecision((current) => {
      const active = current.scenarios.find((scenario) => scenario.id === current.activeScenarioId);
      if (!active) return current;

      const base = activeWeights(current);
      const currentWeight = base[criterionId] ?? 0;
      const next = Math.min(80, Math.max(1, sanitizeNumber(targetWeight, currentWeight)));
      const remainingBefore = Math.max(0, 100 - currentWeight);
      const remainingAfter = 100 - next;

      const weights = Object.fromEntries(
        current.criteria.map((criterion) => {
          if (criterion.id === criterionId) return [criterion.id, next] as const;
          if (remainingBefore <= 0) {
            const otherCount = Math.max(1, current.criteria.length - 1);
            return [criterion.id, remainingAfter / otherCount] as const;
          }

          return [criterion.id, ((base[criterion.id] ?? 0) / remainingBefore) * remainingAfter] as const;
        })
      );

      return {
        ...current,
        scenarios: current.scenarios.map((scenario) =>
          scenario.id === current.activeScenarioId ? { ...scenario, weights } : scenario
        )
      };
    });
  };

  const updateScore = (optionId: string, criterionId: string, value: number) => {
    updateDecision((current) => ({
      ...current,
      options: current.options.map((option) => {
        if (option.id !== optionId) return option;
        const existing = option.scores[criterionId];
        if (!existing) return option;
        return {
          ...option,
          scores: {
            ...option.scores,
            [criterionId]: {
              ...existing,
              value: Math.min(10, Math.max(0, sanitizeNumber(value, existing.value)))
            }
          }
        };
      })
    }));
  };

  const updateConfidence = (optionId: string, criterionId: string, confidence: Confidence) => {
    updateDecision((current) => ({
      ...current,
      options: current.options.map((option) => {
        if (option.id !== optionId) return option;
        const existing = option.scores[criterionId];
        if (!existing) return option;
        return {
          ...option,
          scores: {
            ...option.scores,
            [criterionId]: { ...existing, confidence }
          }
        };
      })
    }));
  };

  const addOption = () => {
    const id = entityId('option');
    updateDecision((current) => {
      if (current.options.length >= 8) return current;
      return {
        ...current,
        options: [
          ...current.options,
          {
            id,
            name: `Option ${current.options.length + 1}`,
            summary: 'Describe this option.',
            scores: Object.fromEntries(
              current.criteria.map((criterion) => [
                criterion.id,
                {
                  value: 5,
                  confidence: 'medium' as const,
                  note: 'Add your own evidence before relying on this score.'
                }
              ])
            )
          }
        ]
      };
    });
  };

  const removeOption = (optionId: string) => {
    updateDecision((current) =>
      current.options.length <= 2
        ? current
        : { ...current, options: current.options.filter((option) => option.id !== optionId) }
    );
  };

  const addCriterion = () => {
    const id = entityId('criterion');
    updateDecision((current) => {
      if (current.criteria.length >= 8) return current;
      return {
        ...current,
        criteria: [
          ...current.criteria,
          {
            id,
            name: `Criterion ${current.criteria.length + 1}`,
            weight: 10,
            description: 'Describe what a high score means for this criterion.'
          }
        ],
        options: current.options.map((option) => ({
          ...option,
          scores: {
            ...option.scores,
            [id]: {
              value: 5,
              confidence: 'medium',
              note: 'Add your own evidence before relying on this score.'
            }
          }
        })),
        scenarios: current.scenarios.map((scenario) => ({
          ...scenario,
          weights: { ...scenario.weights, [id]: 10 }
        }))
      };
    });
  };

  const removeCriterion = (criterionId: string) => {
    updateDecision((current) => {
      if (current.criteria.length <= 2) return current;
      return {
        ...current,
        criteria: current.criteria.filter((criterion) => criterion.id !== criterionId),
        options: current.options.map((option) => {
          const scores = { ...option.scores };
          delete scores[criterionId];
          return { ...option, scores };
        }),
        scenarios: current.scenarios.map((scenario) => {
          const weights = { ...scenario.weights };
          delete weights[criterionId];
          return { ...scenario, weights };
        })
      };
    });
  };

  const handleExport = () => {
    const blob = new Blob([exportDecision(decision)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `tradeoff-${decision.id}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = importDecision(await file.text());
      setDecision(imported);
    } catch {
      window.alert('This file is not a valid Tradeoff decision export.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  const applyAiDraft = (draft: AiDraft) => {
    if (!window.confirm('Replace the current workspace with this AI-generated frame?')) return;
    setDecision(
      createDecisionFromFrame({
        title: draft.title,
        framing: draft.framing,
        options: draft.options.map((option) => ({
          name: option.name,
          summary: option.rationale
        })),
        criteria: draft.criteria.map((criterion) => ({
          name: criterion.name,
          weight: criterion.weight,
          description: criterion.question
        }))
      })
    );
  };

  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to decision workspace
      </a>
      <TopBar
        onNew={() => {
          if (
            window.confirm(
              'Start a new blank decision? Your current workspace is already saved locally and can be exported first.'
            )
          ) {
            setDecision(createBlankDecision());
          }
        }}
        onExport={handleExport}
        onImport={() => importRef.current?.click()}
        onReset={() => {
          if (window.confirm('Reset this workspace to the bundled demo decision?')) {
            setDecision(sampleDecision);
          }
        }}
        persistenceHealthy={persistenceHealthy}
      />
      <input
        ref={importRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        aria-label="Import Tradeoff JSON file"
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />

      <main id="workspace" className="app-shell">
        <DecisionHero
          title={decision.title}
          framing={decision.framing}
          onTitleChange={(title) => updateDecision((current) => ({ ...current, title }))}
          onFramingChange={(framing) => updateDecision((current) => ({ ...current, framing }))}
        />

        <StructureEditor
          decision={decision}
          onOptionNameChange={(optionId, name) =>
            updateDecision((current) => ({
              ...current,
              options: current.options.map((option) =>
                option.id === optionId ? { ...option, name } : option
              )
            }))
          }
          onOptionSummaryChange={(optionId, summary) =>
            updateDecision((current) => ({
              ...current,
              options: current.options.map((option) =>
                option.id === optionId ? { ...option, summary } : option
              )
            }))
          }
          onAddOption={addOption}
          onRemoveOption={removeOption}
          onCriterionNameChange={(criterionId, name) =>
            updateDecision((current) => ({
              ...current,
              criteria: current.criteria.map((criterion) =>
                criterion.id === criterionId ? { ...criterion, name } : criterion
              )
            }))
          }
          onCriterionDescriptionChange={(criterionId, description) =>
            updateDecision((current) => ({
              ...current,
              criteria: current.criteria.map((criterion) =>
                criterion.id === criterionId ? { ...criterion, description } : criterion
              )
            }))
          }
          onAddCriterion={addCriterion}
          onRemoveCriterion={removeCriterion}
        />

        <ScenarioBar
          scenarios={decision.scenarios}
          activeScenarioId={decision.activeScenarioId}
          onSelect={(activeScenarioId) => updateDecision((current) => ({ ...current, activeScenarioId }))}
        />

        <div className="workspace-grid">
          <CriteriaPanel decision={decision} onWeightChange={updateActiveScenarioWeight} />
          <InsightsPanel ranking={ranking} sensitivity={sensitivity} tradeoffs={tradeoffs} />
        </div>

        <DecisionMatrix
          decision={decision}
          ranking={ranking}
          onScoreChange={updateScore}
          onConfidenceChange={updateConfidence}
        />

        <AiCoach decision={decision} onApplyDraft={applyAiDraft} />

        <footer className="product-footer">
          <div>
            <strong>Tradeoff</strong>
            <span>Decision support, not decision replacement.</span>
          </div>
          <p>Scores and rankings are calculated locally. AI is optional and never chooses for you.</p>
        </footer>
      </main>
    </>
  );
}
