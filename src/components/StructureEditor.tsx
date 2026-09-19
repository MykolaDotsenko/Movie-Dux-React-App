import type { Decision } from '../domain/types';

interface StructureEditorProps {
  decision: Decision;
  onOptionNameChange: (optionId: string, name: string) => void;
  onOptionSummaryChange: (optionId: string, summary: string) => void;
  onAddOption: () => void;
  onRemoveOption: (optionId: string) => void;
  onCriterionNameChange: (criterionId: string, name: string) => void;
  onCriterionDescriptionChange: (criterionId: string, description: string) => void;
  onAddCriterion: () => void;
  onRemoveCriterion: (criterionId: string) => void;
}

export function StructureEditor({
  decision,
  onOptionNameChange,
  onOptionSummaryChange,
  onAddOption,
  onRemoveOption,
  onCriterionNameChange,
  onCriterionDescriptionChange,
  onAddCriterion,
  onRemoveCriterion
}: StructureEditorProps) {
  return (
    <details className="panel structure-editor">
      <summary>
        <span>
          <span className="eyebrow">Decision structure</span>
          <strong>Edit options and criteria</strong>
        </span>
        <span className="structure-count">
          {decision.options.length} options · {decision.criteria.length} criteria
        </span>
      </summary>

      <div className="structure-grid">
        <section aria-labelledby="options-structure-heading">
          <div className="structure-section-head">
            <h2 id="options-structure-heading">Options</h2>
            <button
              className="button button--ghost"
              type="button"
              disabled={decision.options.length >= 8}
              onClick={onAddOption}
            >
              + Option
            </button>
          </div>
          <div className="structure-list">
            {decision.options.map((option, index) => (
              <div className="structure-item" key={option.id}>
                <span className="criterion-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <label htmlFor={`option-name-${option.id}`}>Option name</label>
                  <input
                    id={`option-name-${option.id}`}
                    value={option.name}
                    maxLength={70}
                    onChange={(event) => onOptionNameChange(option.id, event.target.value)}
                  />
                  <label htmlFor={`option-summary-${option.id}`}>Short description</label>
                  <textarea
                    id={`option-summary-${option.id}`}
                    rows={2}
                    maxLength={180}
                    value={option.summary}
                    onChange={(event) => onOptionSummaryChange(option.id, event.target.value)}
                  />
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove ${option.name}`}
                  disabled={decision.options.length <= 2}
                  onClick={() => onRemoveOption(option.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="criteria-structure-heading">
          <div className="structure-section-head">
            <h2 id="criteria-structure-heading">Criteria</h2>
            <button
              className="button button--ghost"
              type="button"
              disabled={decision.criteria.length >= 8}
              onClick={onAddCriterion}
            >
              + Criterion
            </button>
          </div>
          <div className="structure-list">
            {decision.criteria.map((criterion, index) => (
              <div className="structure-item" key={criterion.id}>
                <span className="criterion-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <label htmlFor={`criterion-name-${criterion.id}`}>Criterion name</label>
                  <input
                    id={`criterion-name-${criterion.id}`}
                    value={criterion.name}
                    maxLength={70}
                    onChange={(event) => onCriterionNameChange(criterion.id, event.target.value)}
                  />
                  <label htmlFor={`criterion-description-${criterion.id}`}>What it means</label>
                  <textarea
                    id={`criterion-description-${criterion.id}`}
                    rows={2}
                    maxLength={220}
                    value={criterion.description}
                    onChange={(event) => onCriterionDescriptionChange(criterion.id, event.target.value)}
                  />
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove ${criterion.name}`}
                  disabled={decision.criteria.length <= 2}
                  onClick={() => onRemoveCriterion(criterion.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </details>
  );
}
