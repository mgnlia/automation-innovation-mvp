# FlowPilot — Automation Innovation MVP

FlowPilot is a judge-aligned MVP for inventory automation outcomes:

- Unified inventory dashboard
- If/then automation rule engine
- Heuristic AI restock predictor
- Real-time webhook/sync simulation
- Low-stock and anomaly alerting

## Live URL

- **Production:** https://flowpilot-mvp-tau.vercel.app
- **Verification evidence:** URL loads the FlowPilot operator console UI (validated 2026-02-14).

## Demo flow (3 minutes)

1. Open the live URL.
2. In **Unified Inventory Dashboard**, identify low-stock SKUs (status badge `low` / `critical`).
3. In **If/Then Rule Engine**, add:
   - IF = `stock_below`
   - value = `20`
   - THEN = `create_restock_ticket`
4. Start **Real-time Sync / Webhook Simulation** and click **Run One Event** repeatedly.
5. Inject a `sale` webhook for a low-stock SKU (delta `8`) and observe:
   - stock decrement in dashboard
   - alert creation in Alerting panel
   - rule-fired events in stream log
6. Click **Run Predictor** in **AI Restock Predictor** and explain reorder recommendations.

## Architecture

### Frontend (Vercel static)

- `index.html` — FlowPilot operator UI
- `app.js` — dashboard state, rules, simulation, predictor, alerting logic
- `styles.css` — responsive dark UI

### Python service (`services/python-automation`)

FastAPI (`uv` managed):

- `GET /health`
- `GET /inventory`
- `POST /plan`
- `POST /predict/restock`
- `POST /rules/evaluate`
- `POST /webhook/simulate`

### TS orchestrator (`services/ts-orchestrator`)

Fastify + TypeScript:

- `GET /health`
- `POST /simulate`
- `POST /rules/evaluate`

## Local run

### Frontend

```bash
python -m http.server 8080
# open http://localhost:8080
```

### Python service (uv)

```bash
cd services/python-automation
uv sync --all-groups
uv run pytest
uv run uvicorn app.main:app --reload --port 8001
```

### TS service

```bash
cd services/ts-orchestrator
npm install
npm run typecheck
npm run test
npm run dev
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs:

- Python tests (`uv run pytest`)
- TypeScript typecheck and tests (`npm run typecheck`, `npm run test`)

## Deployment

### Vercel (Static Frontend)

The `vercel` CLI is **not available** in the runner. Use the Vercel REST API instead:

```bash
# Using the deploy script (no CLI needed)
node deploy-vercel.mjs /path/to/static/files
```

Requires `VERCEL_TOKEN` environment variable.

## Submission mapping

See `checklists/submission-mapping.md` for P0/judge criteria mapping.
