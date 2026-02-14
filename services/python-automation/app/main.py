from __future__ import annotations

from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="FlowPilot Planner API", version="0.2.0")


class InventoryItem(BaseModel):
    sku: str
    name: str
    stock: int = Field(ge=0)
    reorder_point: int = Field(ge=0)
    avg_daily_sales: float = Field(ge=0)
    lead_time_days: int = Field(ge=1)
    volatility: float = Field(ge=0, le=1)
    anomaly_score: float = Field(ge=0, le=1)


class Rule(BaseModel):
    condition: Literal["stock_below", "anomaly_above", "event_type"]
    value: str
    action: str


class WebhookEvent(BaseModel):
    sku: str
    event_type: Literal["sale", "restock", "correction", "anomaly"]
    delta: int


class PlanRequest(BaseModel):
    objective: str
    trigger: str
    action: str
    guardrail: str


INVENTORY: list[InventoryItem] = [
    InventoryItem(
        sku="SKU-1001",
        name="Wireless Barcode Scanner",
        stock=42,
        reorder_point=25,
        avg_daily_sales=7,
        lead_time_days=5,
        volatility=0.18,
        anomaly_score=0.09,
    ),
    InventoryItem(
        sku="SKU-1002",
        name="Thermal Label Roll Pack",
        stock=16,
        reorder_point=30,
        avg_daily_sales=9,
        lead_time_days=4,
        volatility=0.24,
        anomaly_score=0.14,
    ),
    InventoryItem(
        sku="SKU-1003",
        name="Packing Tape Case",
        stock=85,
        reorder_point=40,
        avg_daily_sales=11,
        lead_time_days=7,
        volatility=0.13,
        anomaly_score=0.05,
    ),
]


def _inventory_lookup(sku: str) -> InventoryItem | None:
    return next((item for item in INVENTORY if item.sku == sku), None)


def _predict_restock(item: InventoryItem) -> dict[str, object]:
    demand_during_lead_time = item.avg_daily_sales * item.lead_time_days
    volatility_buffer = int(demand_during_lead_time * item.volatility + 0.999)
    reorder_qty = max(0, int(demand_during_lead_time + volatility_buffer - item.stock))
    confidence = max(0.55, round(0.96 - item.volatility, 2))
    risk = "low" if reorder_qty == 0 else "medium" if reorder_qty <= item.reorder_point else "high"

    return {
        "sku": item.sku,
        "recommended_reorder": reorder_qty,
        "confidence": confidence,
        "risk": risk,
    }


def _apply_event(item: InventoryItem, event_type: str, delta: int) -> None:
    if event_type == "sale":
        item.stock = max(0, item.stock - abs(delta))
        item.anomaly_score = min(1.0, item.anomaly_score + 0.02)
    elif event_type == "restock":
        item.stock = item.stock + abs(delta)
        item.anomaly_score = max(0.0, item.anomaly_score - 0.03)
    elif event_type == "correction":
        item.stock = max(0, item.stock + delta)
    elif event_type == "anomaly":
        item.anomaly_score = min(1.0, item.anomaly_score + 0.12)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/inventory")
def inventory() -> dict[str, list[dict[str, object]]]:
    return {"items": [item.model_dump() for item in INVENTORY]}


@app.post("/plan")
def plan(req: PlanRequest) -> dict[str, object]:
    return {
        "objective": req.objective,
        "steps": [
            f"Ingest trigger event: {req.trigger}",
            "Normalize and enrich inventory context",
            f"Execute primary action: {req.action}",
            f"Apply guardrail: {req.guardrail}",
            "Persist audit trail and metrics",
        ],
        "risk_controls": {
            "human_approval": "high" if "approval" in req.guardrail.lower() else "conditional",
            "target_intervention_rate_pct": 10,
        },
    }


@app.post("/predict/restock")
def predict_restock() -> dict[str, list[dict[str, object]]]:
    return {"predictions": [_predict_restock(item) for item in INVENTORY]}


@app.post("/rules/evaluate")
def evaluate_rules(payload: dict[str, object]) -> dict[str, list[str]]:
    event_type = str(payload.get("event_type", ""))
    sku = str(payload.get("sku", ""))
    stock = int(payload.get("stock", 0))
    anomaly_score = float(payload.get("anomaly_score", 0))
    rules_raw = payload.get("rules", [])

    rules: list[Rule] = [Rule.model_validate(rule) for rule in rules_raw] if isinstance(rules_raw, list) else []

    fired: list[str] = []
    for rule in rules:
        if rule.condition == "stock_below":
            threshold = int(float(rule.value))
            if stock < threshold:
                fired.append(f"{sku}: {rule.action}")
        elif rule.condition == "anomaly_above":
            threshold = float(rule.value)
            if anomaly_score > threshold:
                fired.append(f"{sku}: {rule.action}")
        elif rule.condition == "event_type":
            if event_type.lower() == rule.value.lower():
                fired.append(f"{sku}: {rule.action}")

    return {"alerts": fired}


@app.post("/webhook/simulate")
def webhook_simulate(event: WebhookEvent) -> dict[str, object]:
    item = _inventory_lookup(event.sku)
    if item is None:
        raise HTTPException(status_code=404, detail="SKU not found")

    _apply_event(item, event.event_type, event.delta)

    alerts: list[str] = []
    if item.stock <= item.reorder_point:
        alerts.append(f"{item.sku} low stock")
    if item.anomaly_score >= 0.2:
        alerts.append(f"{item.sku} anomaly score high")

    return {
        "item": item.model_dump(),
        "alerts": alerts,
        "event": event.model_dump(),
    }
