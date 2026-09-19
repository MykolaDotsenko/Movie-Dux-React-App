interface DecisionHeroProps {
  title: string;
  framing: string;
  onTitleChange: (title: string) => void;
  onFramingChange: (framing: string) => void;
}

export function DecisionHero({ title, framing, onTitleChange, onFramingChange }: DecisionHeroProps) {
  return (
    <section className="hero" aria-labelledby="decision-heading">
      <div>
        <p className="eyebrow">Decision workspace</p>
        <label className="sr-only" htmlFor="decision-title">
          Decision title
        </label>
        <input
          id="decision-title"
          className="hero-title-input"
          value={title}
          maxLength={120}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <label className="sr-only" htmlFor="decision-framing">
          Decision framing
        </label>
        <textarea
          id="decision-framing"
          className="hero-framing"
          value={framing}
          rows={2}
          maxLength={420}
          onChange={(event) => onFramingChange(event.target.value)}
        />
      </div>
      <div className="hero-note">
        <span className="hero-note-number">01</span>
        <p>
          Scores express your current evidence. Confidence describes how trustworthy that evidence is.
          Tradeoff keeps those signals separate.
        </p>
      </div>
      <h1 id="decision-heading" className="sr-only">
        {title}
      </h1>
    </section>
  );
}
