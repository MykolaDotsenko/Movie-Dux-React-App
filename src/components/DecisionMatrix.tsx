import type { Confidence, Decision, RankedOption } from '../domain/types';

interface DecisionMatrixProps {
  decision: Decision;
  ranking: RankedOption[];
  onScoreChange: (optionId: string, criterionId: string, value: number) => void;
  onConfidenceChange: (optionId: string, criterionId: string, confidence: Confidence) => void;
}

export function DecisionMatrix({
  decision,
  ranking,
  onScoreChange,
  onConfidenceChange
}: DecisionMatrixProps) {
  const rankById = new Map(ranking.map((item, index) => [item.optionId, { ...item, rank: index + 1 }]));

  return (
    <section className="panel matrix-panel" aria-labelledby="matrix-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Evidence matrix</p>
          <h2 id="matrix-heading">Score what you know</h2>
        </div>
        <p className="panel-explainer">0–10 score · confidence stays separate</p>
      </div>

      <div className="matrix-scroll" tabIndex={0} aria-label="Decision scoring matrix">
        <table className="matrix-table">
          <thead>
            <tr>
              <th scope="col">Option</th>
              {decision.criteria.map((criterion) => (
                <th scope="col" key={criterion.id}>
                  {criterion.name}
                </th>
              ))}
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {decision.options.map((option) => {
              const ranked = rankById.get(option.id);
              return (
                <tr key={option.id}>
                  <th scope="row">
                    <strong>{option.name}</strong>
                    <span>{option.summary}</span>
                  </th>
                  {decision.criteria.map((criterion) => {
                    const score = option.scores[criterion.id];
                    if (!score) return <td key={criterion.id}>—</td>;
                    return (
                      <td key={criterion.id}>
                        <label className="sr-only" htmlFor={`${option.id}-${criterion.id}-score`}>
                          {option.name}, {criterion.name} score
                        </label>
                        <input
                          id={`${option.id}-${criterion.id}-score`}
                          className="score-input"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="10"
                          step="0.5"
                          value={score.value}
                          onChange={(event) =>
                            onScoreChange(option.id, criterion.id, Number(event.target.value))
                          }
                        />
                        <label className="sr-only" htmlFor={`${option.id}-${criterion.id}-confidence`}>
                          {option.name}, {criterion.name} confidence
                        </label>
                        <select
                          id={`${option.id}-${criterion.id}-confidence`}
                          className="confidence-select"
                          value={score.confidence}
                          onChange={(event) =>
                            onConfidenceChange(option.id, criterion.id, event.target.value as Confidence)
                          }
                        >
                          <option value="high">High confidence</option>
                          <option value="medium">Medium confidence</option>
                          <option value="low">Low confidence</option>
                        </select>
                      </td>
                    );
                  })}
                  <td className="result-cell">
                    <span className="rank">#{ranked?.rank ?? '—'}</span>
                    <strong>{ranked?.score.toFixed(1) ?? '—'}</strong>
                    <small>{ranked?.confidence.toFixed(0) ?? '—'}% evidence confidence</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
