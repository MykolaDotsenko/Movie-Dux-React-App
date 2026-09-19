import type { Scenario } from '../domain/types';

interface ScenarioBarProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelect: (scenarioId: string) => void;
}

export function ScenarioBar({ scenarios, activeScenarioId, onSelect }: ScenarioBarProps) {
  return (
    <section className="scenario-strip" aria-labelledby="scenario-heading">
      <div>
        <p className="eyebrow" id="scenario-heading">
          Scenario
        </p>
        <p className="muted">Switch priorities without changing evidence scores.</p>
      </div>
      <div className="scenario-buttons">
        {scenarios.map((scenario) => (
          <button
            type="button"
            className={`scenario-pill ${scenario.id === activeScenarioId ? 'scenario-pill--active' : ''}`}
            aria-pressed={scenario.id === activeScenarioId}
            onClick={() => onSelect(scenario.id)}
            key={scenario.id}
          >
            {scenario.name}
          </button>
        ))}
      </div>
    </section>
  );
}
