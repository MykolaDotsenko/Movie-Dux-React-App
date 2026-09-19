# Production deployment

Tradeoff is designed for a dedicated Vercel project connected to the repository:

`MykolaDotsenko/tradeoff-decision-lab`

Do not reuse the existing `moviedux` Vercel project; it belongs to a different repository and product.

## Project settings

Recommended Vercel project name:

`tradeoff-decision-lab`

Expected settings:

- Framework preset: Vite (automatic detection is preferred)
- Root directory: repository root
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 24.x
- Production branch: `main`

The repository already contains `vercel.json` for the API function cancellation behavior and response-security headers.

## Environment variables

The deterministic product works without any AI secret.

For the optional Decision Copilot, configure at least one server-side provider key:

```text
GEMINI_API_KEY
OPENROUTER_API_KEY
```

Recommended production setup uses both so Gemini can fail over to OpenRouter.

Optional deployment metadata:

```text
TRADEOFF_ALLOWED_ORIGIN=https://your-production-domain.example
TRADEOFF_SITE_URL=https://your-production-domain.example
```

Never create a `VITE_*` provider secret. Any variable prefixed with `VITE_` is eligible to enter the browser bundle.

## Deployment sequence

1. Import the GitHub repository into a new Vercel project.
2. Deploy `main` without AI secrets first.
3. Confirm the production deployment reaches `READY`.
4. Run the smoke verification:

   ```bash
   npm run smoke:deployment -- https://your-project.vercel.app
   ```

5. Add provider secrets in Vercel Project Settings → Environment Variables.
6. Redeploy production.
7. Run the smoke verification again. The final line should report `aiGateway: "configured"`.
8. Inspect Vercel runtime errors and function logs for `/api/ai`.

## Health contract

`GET /api/health` deliberately returns only:

```json
{
  "status": "ok",
  "service": "tradeoff-decision-lab"
}
```

It does not reveal provider configuration, environment names, secrets, versions, region data, or account metadata.

## AI behavior without secrets

A deployment with no AI provider keys is still valid.

The core decision engine, scenarios, persistence, sensitivity analysis and UI remain fully functional. Explicit AI requests return a bounded `503` response and the UI continues to expose deterministic analysis.

## Post-deploy verification

Production is considered verified only after all of the following pass:

- root page returns HTTP 200
- Tradeoff HTML is served
- baseline security headers are present
- `/api/health` returns HTTP 200
- `/api/ai` either succeeds with a configured provider or fails gracefully when intentionally unconfigured
- no Vercel runtime error clusters appear after smoke testing
- desktop and mobile UI load without console/runtime errors
