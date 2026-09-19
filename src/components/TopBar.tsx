interface TopBarProps {
  onNew: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  persistenceHealthy: boolean;
}

export function TopBar({ onNew, onExport, onImport, onReset, persistenceHealthy }: TopBarProps) {
  return (
    <header className="topbar">
      <a className="brand" href="#workspace" aria-label="Tradeoff home">
        <span className="brand-mark" aria-hidden="true">
          T
        </span>
        <span>Tradeoff</span>
      </a>
      <div className="topbar-actions">
        <span className={`save-status ${persistenceHealthy ? '' : 'save-status--warn'}`}>
          <span aria-hidden="true">{persistenceHealthy ? '●' : '!'}</span>
          {persistenceHealthy ? 'Saved locally' : 'Local save unavailable'}
        </span>
        <button className="button button--ghost" type="button" onClick={onNew}>
          New
        </button>
        <button className="button button--ghost" type="button" onClick={onImport}>
          Import
        </button>
        <button className="button button--ghost" type="button" onClick={onExport}>
          Export
        </button>
        <button className="button button--ghost danger-text" type="button" onClick={onReset}>
          Reset demo
        </button>
      </div>
    </header>
  );
}
