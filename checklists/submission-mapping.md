# Submission Mapping (Automation Innovation Hackathon) — FlowPilot

## Judge-aligned checklist

- [x] **Problem clarity**: FlowPilot addresses inventory stockouts and brittle, manual reorder coordination.
- [x] **Innovation**: Unified inventory + if/then rules + heuristic AI restock predictor + real-time webhook simulation in one operator surface.
- [x] **Technical execution**: Frontend MVP + Python planning/simulation API (`uv`) + TS rules orchestrator + CI tests.
- [x] **Usability/demo**: Deterministic 3-minute flow in README with expected outputs.
- [ ] **Impact metrics**: Add benchmark deltas (stockout reduction %, mean response time, intervention rate).
- [ ] **Polish**: Add persistence layer + role-based views + connector adapters.

## P0 requirement mapping

- [x] Unified inventory dashboard
- [x] If/then automation rule engine
- [x] AI restock predictor (heuristic)
- [x] Real-time sync simulation / webhook events
- [x] Alerting for low stock / anomalies
- [x] Clean architecture + docs

## Demo script mapping (3 minutes)

1. **Problem framing (20s)**
   - Teams miss reorder windows because inventory signals are fragmented.
2. **Dashboard (35s)**
   - Show SKUs, current stock, reorder points, and risk status badges.
3. **Rule engine (40s)**
   - Add rule: `IF stock_below 20 THEN create_restock_ticket`.
4. **Real-time simulation (40s)**
   - Start event stream and inject webhook sale events; show stock updates and rule-triggered alerts.
5. **AI predictor (30s)**
   - Run predictor and explain formula: demand during lead time + volatility buffer.
6. **Architecture + reliability (35s)**
   - Walk Python + TS endpoints, CI checks, and Vercel production URL.

## Submission assets checklist

- [x] Public GitHub repo
- [ ] Live production URL (Vercel)
- [x] README with setup + demo flow
- [ ] Short demo video (<=3 min)
- [ ] Architecture diagram
- [ ] Impact metrics snapshot
