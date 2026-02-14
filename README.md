# Automation Innovation MVP

Deployment-first scaffold for the Automation Innovation Hackathon. This repo ships a live baseline first, then iterates features.

## Live URL

- Production: _to be filled after first deploy_

## What is included

- **`index.html` + `styles.css` + `app.js`**: demo UI for creating an automation workflow from goal/trigger/action/guardrail inputs.
- **`services/python-automation`**: `uv`-based FastAPI template with `/health` and `/plan` endpoints.
- **`services/ts-orchestrator`**: TypeScript Fastify template with `/health` and `/simulate` endpoints.
- **`.github/workflows/ci.yml`**: baseline CI for Python + TS tests.
- **`checklists/submission-mapping.md`**: judge criteria mapping and demo checklist.

## Demo flow (2-3 minutes)

1. Open the live URL.
2. Enter an automation objective (e.g. `Triage customer tickets and notify owner`).
3. Select trigger, action, and guardrail.
4. Click **Generate Automation Plan**.
5. Show generated workflow graph + execution simulation + risk controls.
6. Explain how backend services can execute this plan (`/plan` in Python, `/simulate` in TS).

## Local run

### Frontend (static)

```bash
python -m http.server 8080
# open http://localhost:8080
```

### Python service

```bash
cd services/python-automation
uv sync --all-groups
uv run pytest
uv run uvicorn app.main:app --reload --port 8001
```

### TypeScript service

```bash
cd services/ts-orchestrator
npm install
npm run test
npm run dev
```

## Vercel deploy

```bash
vercel --prod --token "$VERCEL_TOKEN"
```

## Next iteration queue

- Connect frontend to TS `/simulate` endpoint
- Add workflow template persistence
- Add prompt-based natural language parser for automation goals
- Add evaluation metrics (time saved, error rate, intervention rate)
