# Architecture (MVP)

```text
[User UI (Vercel static site)]
        |
        | plan input (objective/trigger/action/guardrail)
        v
[Python Planner API]
  - /health
  - /plan
        |
        | normalized plan envelope
        v
[TS Orchestrator API]
  - /health
  - /simulate
        |
        v
[Execution trace + audit log (simulated)]
```

## Design choices
- Deploy-first baseline minimizes integration risk before feature expansion.
- Separate Python and TS services preserve flexibility for model/tool selection.
- Guardrail field is first-class to align with safe automation judging criteria.
