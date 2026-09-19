# Tradeoff architecture

## Design goals

1. Keep ranking deterministic and inspectable.
2. Keep evidence confidence separate from preference scoring.
3. Make scenario changes reversible and non-destructive.
4. Keep private decision state local by default.
5. Treat AI as an optional external language layer, never as the source of truth.
6. Keep domain rules independent from React and browser APIs.
7. Prefer proportional architecture over layers that only proxy another layer.

## Dependency direction

```text
React components
      ↓
App orchestration / explicit state ownership
      ↓
┌───────────────┬────────────────┬─────────────────┐
│ pure domain   │ storage adapter│ AI client       │
└───────────────┴────────────────┴─────────────────┘
                                   ↓
                                /api/ai
                                   ↓
                          provider abstraction
                           ↙             ↘
                     Gemini        OpenRouter
```

The domain module imports no React, DOM, storage, network, or AI code.

## State ownership

One `Decision` owns criteria, options, score cells, scenarios, the active scenario, and metadata. UI components receive state and explicit callbacks; they do not persist or mutate global data independently.

A score cell contains:

- numeric 0–10 score;
- evidence confidence (`low`, `medium`, `high`);
- local evidence note.

Scenario weights never alter score cells.

## Ranking

For each option:

```text
Σ (score / 10 × normalized criterion weight)
```

The result is 0–100. Ties are ordered alphabetically **only for deterministic rendering**. Confidence never changes score or tie order.

## Confidence

Confidence is a separate evidence-quality indicator. Current display factors are:

```text
low     0.55
medium  0.78
high    1.00
```

They answer “how strong is the evidence behind these inputs?”, not “which option should win?”. Combining the two would hide uncertainty inside the preference score.

## Weight normalization

Scenario weights are normalized to 100 before scoring. If all raw weights become zero, Tradeoff falls back to equal weights instead of producing invalid arithmetic.

When one slider changes, the selected criterion receives the requested weight and the remainder is proportionally rescaled.

## Sensitivity analysis

The stress test:

1. captures the current leader;
2. changes one criterion weight one point at a time;
3. proportionally rescales all other weights;
4. scans up to ±40 points within a 5–95 bound;
5. reports the smallest tested single-criterion change that changes the leader.

This is a local sensitivity test, not a global optimization proof or prediction.

## Persistence boundary

The Web Storage adapter:

- uses a versioned key;
- validates restored data with Zod;
- validates referential invariants (unique IDs, active scenario, complete score/weight maps);
- catches browser storage failures;
- supports explicit JSON import/export.

Future schema changes belong in version-aware migrations, not React components.

## AI gateway

The frontend calls one provider-neutral `/api/ai` endpoint in two modes: `draft` and `review`.

The gateway:

- validates request size and shape;
- treats decision text as untrusted data;
- has no tools or external actions;
- tries Gemini first and OpenRouter second;
- applies a bounded timeout;
- requests structured JSON;
- validates output with Zod before returning it;
- returns `{ provider, data }`;
- disables caching;
- optionally checks origin;
- applies a best-effort demo rate limit.

Review mode intentionally excludes local evidence notes from the provider payload.

## Failure model

Core decision analysis has no network dependency.

- storage unavailable → session remains usable;
- corrupt persisted state → rejected at the adapter boundary;
- invalid import → rejected before state replacement;
- AI unconfigured → AI panel degrades gracefully;
- Gemini unavailable → OpenRouter is attempted;
- both providers unavailable → deterministic analysis remains available;
- malformed provider output → rejected before UI rendering.

This keeps optional infrastructure outside the product's correctness boundary.
