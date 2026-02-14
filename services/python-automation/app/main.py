from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Automation Planner API", version="0.1.0")


class PlanRequest(BaseModel):
    objective: str
    trigger: str
    action: str
    guardrail: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/plan")
def plan(req: PlanRequest) -> dict[str, object]:
    return {
        "objective": req.objective,
        "steps": [
            f"Ingest trigger event: {req.trigger}",
            "Enrich payload with context",
            f"Execute action: {req.action}",
            f"Enforce guardrail: {req.guardrail}",
            "Write audit trail",
        ],
        "risk": {"requires_human_approval": "high-risk" in req.guardrail.lower()},
    }
