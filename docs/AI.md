# AI integration

Tradeoff treats AI as an **optional language layer**, never as part of the scoring or correctness boundary.

## Provider strategy

```text
browser
  ↓ same-origin POST /api/ai
serverless AI gateway
  ↓
Gemini 3.8 Flash (primary)
  ↓ provider failure / timeout / quota / invalid output
DeepSeek Chat (fallback)
  ↓ provider failure / timeout / quota / invalid output
OpenRouter openrouter/free (secondary fallback)
  ↓ failure
bounded error → deterministic Tradeoff remains fully usable
```

The provider choice is intentionally hidden behind one server boundary. Browser code consumes one provider-neutral response envelope.

## Why AI is not the ranking engine

Tradeoff keeps preference arithmetic inspectable and testable. AI may:

- turn rough text into an editable decision frame;
- propose criteria and questions;
- surface blind spots and assumptions;
- identify useful evidence to collect next.

AI may **not**:

- assign factual option scores;
- silently alter weights;
- recompute or override the ranking;
- select or endorse a winner;
- mutate local decision state without an explicit user action.

## Structured output

All providers are asked for JSON. The server parses every response again with Zod before returning it to the browser, and the browser validates the provider-neutral envelope once more.

```text
provider schema
    ↓
server JSON parse + Zod
    ↓
{ provider, data }
    ↓
client Zod
```

Structured output is a shape guarantee, not a truth guarantee. Suggested criteria and wording remain editable and must be evaluated by the user.

## Prompt-injection boundary

Decision text and workspace context are untrusted data. They are serialized as JSON-encoded data and kept in the user/input channel, while provider system instructions remain separate and explicitly forbid treating embedded commands, role changes, tool requests, or attempts to override rules as instructions.

The AI route exposes no tools, browsing, file access, or external actions.

## Privacy boundary

AI is opt-in per request. Loading, scoring, scenario switching, sensitivity analysis, persistence, import, and export make no AI request.

Review mode sends only the visible decision framing, option labels/descriptions, numeric scores, confidence labels, criteria, and scenario weights. **Local evidence notes are not sent.**

The UI states this boundary next to the AI controls. Gemini requests also set `store: false`, so the Interactions API is used statelessly rather than relying on its default server-side conversation storage.

## Secret handling

Provider secrets are server-only:

```text
GEMINI_API_KEY
DEEPSEEK_API_KEY
OPENROUTER_API_KEY
```

Never use `VITE_GEMINI_API_KEY` or `VITE_OPENROUTER_API_KEY`: Vite-prefixed values become browser-visible build-time environment variables.

Optional hardening:

```text
TRADEOFF_ALLOWED_ORIGIN
TRADEOFF_SITE_URL
```

## Reliability controls

The gateway includes:

- bounded request bodies;
- strict request schemas;
- 8-second provider timeout;
- primary → fallback provider chain;
- response validation after every provider;
- `Cache-Control: no-store`;
- same-origin browser-request validation by default, with an optional explicit origin override;
- best-effort per-instance rate limiting with a bounded client map;
- bounded error responses without provider secrets.

The in-memory rate limiter is deliberately only a portfolio/demo safeguard. A multi-instance production service should use a shared rate-limit store at the edge or data layer.

## Operational setup

Configure at least one provider in Vercel. For the strongest demo resilience configure both:

1. `GEMINI_API_KEY` — primary;
2. `DEEPSEEK_API_KEY` — primary fallback;
3. `OPENROUTER_API_KEY` — secondary fallback;
4. optionally `TRADEOFF_ALLOWED_ORIGIN=https://your-domain.example` to pin browser requests to one canonical origin instead of the request URL origin;
5. optionally `TRADEOFF_SITE_URL=https://your-domain.example` for OpenRouter attribution.

Free-tier capacity is opportunistic demo capacity, not an availability SLA. The product is designed so provider downtime never disables deterministic analysis.
