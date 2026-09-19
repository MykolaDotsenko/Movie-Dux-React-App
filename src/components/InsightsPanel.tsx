import type { RankedOption, SensitivityFinding } from '../domain/types';
import type { TradeoffInsight } from '../domain/scoring';

interface InsightsPanelProps {
  ranking: RankedOption[];
  sensitivity: SensitivityFinding | null;
  tradeoffs: TradeoffInsight[];
}

export function InsightsPanel({ ranking, sensitivity, tradeoffs }: InsightsPanelProps) {
  const leader = ranking[0];
  const runnerUp = ranking[1];
  const margin = leader && runnerUp ? leader.score - runnerUp.score : 0;

  return (
    <section className="insights-grid" aria-labelledby="insights-heading">
      <h2 id="insights-heading" className="sr-only">
        Decision insights
      </h2>

      <article className="panel ranking-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Current ranking</p>
            <h3>Evidence-weighted result</h3>
          </div>
          <span className="number-chip">{margin.toFixed(1)} pt gap</span>
        </div>
        <ol className="ranking-list">
          {ranking.map((item, index) => (
            <li key={item.optionId}>
              <span className="ranking-position">{String(index + 1).padStart(2, '0')}</span>
              <div className="ranking-copy">
                <strong>{item.name}</strong>
                <span>{item.confidence.toFixed(0)}% evidence confidence</span>
              </div>
              <div className="ranking-score">
                <strong>{item.score.toFixed(1)}</strong>
                <span
                  className="ranking-bar"
                  style={{ '--score': `${item.score}%` } as React.CSSProperties}
                  aria-hidden="true"
                />
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="panel sensitivity-card">
        <p className="eyebrow">Stress test</p>
        <h3>{sensitivity ? 'The lead can flip' : 'The lead is stable nearby'}</h3>
        {sensitivity ? (
          <>
            <p className="large-insight">
              Move <strong>{sensitivity.criterionName}</strong> from {sensitivity.originalWeight.toFixed(0)}%
              to {sensitivity.flipWeight.toFixed(0)}% and <strong>{sensitivity.newLeaderName}</strong> becomes
              first.
            </p>
            <p className="muted">
              A {sensitivity.delta}-point weight change is the smallest flip found within the ±40 point scan.
            </p>
          </>
        ) : (
          <p className="large-insight">
            No single criterion changed the leader inside the tested ±40 point range.
          </p>
        )}
      </article>

      <article className="panel tradeoff-card">
        <p className="eyebrow">Why the top two differ</p>
        <h3>Largest contribution gaps</h3>
        <div className="tradeoff-list">
          {tradeoffs.map((tradeoff) => (
            <div key={tradeoff.criterionId}>
              <span>{tradeoff.criterionName}</span>
              <strong className={tradeoff.delta >= 0 ? 'positive' : 'negative'}>
                {tradeoff.delta >= 0 ? '+' : ''}
                {tradeoff.delta.toFixed(1)}
              </strong>
            </div>
          ))}
        </div>
        <p className="muted">
          These are weighted contribution gaps, not claims that one option is objectively better.
        </p>
      </article>
    </section>
  );
}
