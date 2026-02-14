const LOW_THRESHOLD = 20;
const CRITICAL_THRESHOLD = 10;

const state = {
  inventory: [
    { sku: "SKU-1001", name: "Sensor Hub", stock: 48, velocity: 6 },
    { sku: "SKU-1002", name: "RFID Tag Pack", stock: 22, velocity: 8 },
    { sku: "SKU-1003", name: "Barcode Scanner", stock: 17, velocity: 4 },
    { sku: "SKU-1004", name: "Thermal Label", stock: 9, velocity: 5 },
    { sku: "SKU-1005", name: "Dock Charger", stock: 31, velocity: 3 }
  ],
  rules: [
    {
      id: crypto.randomUUID(),
      condition: "stock_below",
      value: 20,
      action: "create_restock_ticket"
    }
  ],
  alerts: [],
  stream: [],
  simTimer: null,
  ticketsIssued: 0
};

const inventoryBody = document.getElementById("inventory-body");
const inventorySummary = document.getElementById("inventory-summary");
const rulesList = document.getElementById("rules-list");
const alertsList = document.getElementById("alerts-list");
const alertCount = document.getElementById("alert-count");
const streamList = document.getElementById("stream-list");
const predictorOutput = document.getElementById("predictor-output");
const injectSku = document.getElementById("inject-sku");

function statusForStock(stock) {
  if (stock <= CRITICAL_THRESHOLD) return "critical";
  if (stock <= LOW_THRESHOLD) return "low";
  return "healthy";
}

function pushStream(message, level = "info") {
  state.stream.unshift(`[${new Date().toLocaleTimeString()}] [${level}] ${message}`);
  state.stream = state.stream.slice(0, 80);
}

function pushAlert(message) {
  state.alerts.unshift({ message, at: new Date().toISOString() });
  state.alerts = state.alerts.slice(0, 40);
}

function renderInventory() {
  inventoryBody.innerHTML = "";
  let low = 0;
  let critical = 0;

  state.inventory.forEach((item) => {
    const status = statusForStock(item.stock);
    if (status === "low") low += 1;
    if (status === "critical") critical += 1;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.sku}</td>
      <td>${item.name}</td>
      <td>${item.stock}</td>
      <td><span class="badge ${status}">${status}</span></td>
      <td>${item.velocity}</td>
    `;
    inventoryBody.appendChild(tr);
  });

  inventorySummary.textContent = `${state.inventory.length} SKUs • ${low} low • ${critical} critical`;
}

function renderRules() {
  rulesList.innerHTML = "";
  state.rules.forEach((rule) => {
    const li = document.createElement("li");
    li.textContent = `IF ${rule.condition} < ${rule.value} THEN ${rule.action}`;
    rulesList.appendChild(li);
  });
}

function renderAlerts() {
  alertsList.innerHTML = "";
  state.alerts.forEach((alert) => {
    const li = document.createElement("li");
    li.textContent = `${new Date(alert.at).toLocaleTimeString()} — ${alert.message}`;
    alertsList.appendChild(li);
  });
  alertCount.textContent = `${state.alerts.length} active`;
}

function renderStream() {
  streamList.innerHTML = "";
  state.stream.forEach((event) => {
    const li = document.createElement("li");
    li.textContent = event;
    streamList.appendChild(li);
  });
}

function renderSkuOptions() {
  injectSku.innerHTML = "";
  state.inventory.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.sku;
    option.textContent = `${item.sku} (${item.stock})`;
    injectSku.appendChild(option);
  });
}

function applyWebhook({ sku, type, delta }) {
  const item = state.inventory.find((x) => x.sku === sku);
  if (!item) {
    pushStream(`Unknown SKU ${sku} ignored`, "warn");
    return;
  }

  if (type === "sale") item.stock = Math.max(0, item.stock - delta);
  if (type === "restock") item.stock += delta;
  if (type === "adjustment") item.stock = Math.max(0, item.stock + delta);

  pushStream(`Webhook ${type} for ${sku}, delta ${delta}, stock now ${item.stock}`);

  const status = statusForStock(item.stock);
  if (status !== "healthy") {
    pushAlert(`${item.sku} (${item.name}) is ${status} at stock ${item.stock}`);
  }

  state.rules.forEach((rule) => {
    if (rule.condition === "stock_below" && item.stock < Number(rule.value)) {
      if (rule.action === "create_restock_ticket") {
        state.ticketsIssued += 1;
        const ticketId = `RST-${String(state.ticketsIssued).padStart(4, "0")}`;
        pushAlert(`Restock ticket ${ticketId} created for ${item.sku}`);
        pushStream(`Rule fired: ${ticketId} created (${item.sku} < ${rule.value})`, "rule");
      }
      if (rule.action === "raise_alert") {
        pushAlert(`Rule alert: ${item.sku} fell below ${rule.value}`);
        pushStream(`Rule fired: alert raised for ${item.sku}`, "rule");
      }
    }
  });

  renderAll();
}

function randomEvent() {
  const item = state.inventory[Math.floor(Math.random() * state.inventory.length)];
  const eventType = Math.random() < 0.7 ? "sale" : "restock";
  const delta = eventType === "sale" ? Math.ceil(Math.random() * 9) : Math.ceil(Math.random() * 12);
  applyWebhook({ sku: item.sku, type: eventType, delta });
}

function runPredictor() {
  predictorOutput.innerHTML = "";
  const plans = state.inventory
    .map((item) => {
      const projected7DayDemand = item.velocity * 7;
      const safetyStock = Math.ceil(item.velocity * 1.5);
      const reorderPoint = projected7DayDemand + safetyStock;
      const suggestedOrder = Math.max(0, reorderPoint - item.stock);
      const risk = item.stock <= CRITICAL_THRESHOLD ? "high" : item.stock <= LOW_THRESHOLD ? "medium" : "low";

      return { item, reorderPoint, suggestedOrder, risk };
    })
    .sort((a, b) => b.suggestedOrder - a.suggestedOrder);

  plans.forEach((plan) => {
    const li = document.createElement("li");
    li.textContent = `${plan.item.sku}: risk=${plan.risk}, reorder_point=${plan.reorderPoint}, suggested_order=${plan.suggestedOrder}`;
    predictorOutput.appendChild(li);
  });

  pushStream("Predictor executed and recommendations refreshed", "ai");
  renderStream();
}

function renderAll() {
  renderInventory();
  renderRules();
  renderAlerts();
  renderStream();
  renderSkuOptions();
}

document.getElementById("rule-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const condition = document.getElementById("rule-condition").value;
  const value = Number(document.getElementById("rule-value").value);
  const action = document.getElementById("rule-action").value;

  if (!Number.isFinite(value) || value <= 0) {
    pushAlert("Rule value must be a positive number");
    renderAlerts();
    return;
  }

  state.rules.push({ id: crypto.randomUUID(), condition, value, action });
  pushStream(`Rule added: IF ${condition} < ${value} THEN ${action}`, "rule");
  renderAll();
});

document.getElementById("run-one").addEventListener("click", () => randomEvent());

document.getElementById("start-sim").addEventListener("click", () => {
  if (state.simTimer) return;
  state.simTimer = setInterval(randomEvent, 2500);
  pushStream("Simulation stream started", "system");
  renderStream();
});

document.getElementById("stop-sim").addEventListener("click", () => {
  if (!state.simTimer) return;
  clearInterval(state.simTimer);
  state.simTimer = null;
  pushStream("Simulation stream stopped", "system");
  renderStream();
});

document.getElementById("inject-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const sku = document.getElementById("inject-sku").value;
  const type = document.getElementById("inject-type").value;
  const delta = Number(document.getElementById("inject-delta").value);

  if (!Number.isFinite(delta) || delta <= 0) {
    pushAlert("Webhook delta must be a positive number");
    renderAlerts();
    return;
  }

  applyWebhook({ sku, type, delta });
});

document.getElementById("run-predictor").addEventListener("click", runPredictor);

pushStream("FlowPilot initialized", "system");
renderAll();
