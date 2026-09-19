import { activeWeights } from '../domain/scoring';
import type { Decision } from '../domain/types';

interface CriteriaPanelProps {
  decision: Decision;
  onWeightChange: (criterionId: string, weight: number) => void;
}

export function CriteriaPanel({ decision, onWeightChange }: CriteriaPanelProps) {
  const weights = activeWeights(decision);

  return (
    <section className="panel criteria-panel" aria-labelledby="criteria-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Priorities</p>
          <h2 id="criteria-heading">Criteria weights</h2>
        </div>
        <span className="number-chip">100%</span>
      </div>

      <div className="criteria-list">
        {decision.criteria.map((criterion, index) => {
          const weight = weights[criterion.id] ?? 0;
          return (
            <div className="criterion" key={criterion.id}>
              <div className="criterion-head">
                <div>
                  <span className="criterion-index">{String(index + 1).padStart(2, '0')}</span>
                  <label htmlFor={`weight-${criterion.id}`}>{criterion.name}</label>
                </div>
                <output htmlFor={`weight-${criterion.id}`}>{weight.toFixed(0)}%</output>
              </div>
              <input
                id={`weight-${criterion.id}`}
                className="weight-slider"
                type="range"
                min="1"
                max="80"
                value={Math.round(weight)}
                onChange={(event) => onWeightChange(criterion.id, Number(event.target.value))}
              />
              <p>{criterion.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
