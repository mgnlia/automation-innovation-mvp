const MIN_STOCK_DEFAULT = 20;

const inventory = [
  {
    sku: 'SKU-1001',
    name: 'Wireless Barcode Scanner',
    stock: 42,
    reorderPoint: 25,
    avgDailySales: 7,
    leadTimeDays: 5,
    volatility: 0.18,
    anomalyScore: 0.09,
  },
  {
    sku: 'SKU-1002',
    name: 'Thermal Label Roll Pack',
    stock: 16,
    reorderPoint: 30,
    avgDailySales: 9,
    leadTimeDays: 4,
    volatility: 0.24,
    anomalyScore: 0.14,
  },
  {
    sku: 'SKU-1003',
    name: 'Packing Tape Case',
    stock: 85,
    reorderPoint: 40,
    avgDailySales: 11,
    leadTimeDays: 7,
    volatility: 0.13,
    anomalyScore: 0.05,
  },
  {
    sku: 'SKU-1004',
    name: 'Return Mailer Bundle',
    stock: 9,
    reorderPoint: 18,
    avgDailySales: 4,
    leadTimeDays: 6,
    volatility: 0.31,
    anomalyScore: 0.22,
  },
];

const rules = [
  {
    id: crypto.randomUUID(),
    condition: 'stock_below',
    value: '20',
    action: 'create_restock_ticket',
  },
  {
    id: crypto.randomUUID(),
    condition: 'anomaly_above',
    value: '0.20',
    action: 'send_ops_alert',
  },
];

const alerts = [];
const eventHistory = [];
let timer = null;

const inventoryBodyEl = document.querySelector('#inventory-table tbody');
const predictionBodyEl = document.querySelector('#prediction-table tbody');
const rulesListEl = document.querySelector('#rules-list');
const alertsListEl = document.querySelector('#alerts-list');
const eventLogEl = document.querySelector('#event-log');
const webhookSkuEl = document.querySelector('#webhook-sku');
const syncStatusEl = document.querySelector('#sync-status');

const metrics = {
  skus: document.getElementById('metric-skus'),
  lowStock: document.getElementById('metric-low-stock'),
  anomalies: document.getElementById('metric-anomalies'),
  alerts: document.getElementById('metric-alerts'),
};

function classifyStatus(item) {
  if (item.stock <= item.reorderPoint * 0.6) return 'critical';
  if (item.stock <= item.reorderPoint) return 'low';
  return 'healthy';
}

function pushAlert(message, level = 'info') {
  alerts.unshift({
    id: crypto.randomUUID(),
    level,
    message,
    timestamp: new Date().toISOString(),
  });

  if (alerts.length > 20) alerts.pop();
  renderAlerts();
  renderMetrics();
}

function appendEventLog(entry) {
  eventHistory.unshift(entry);
  if (eventHistory.length > 40) eventHistory.pop();

  eventLogEl.innerHTML = '';
  for (const event of eventHistory) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${event.type}</strong> · ${event.message} <span>${event.timestamp}</span>`;
    eventLogEl.appendChild(li);
  }
}

function renderMetrics() {
  const lowStockCount = inventory.filter((item) => item.stock <= item.reorderPoint).length;
  const anomalyCount = inventory.filter((item) => item.anomalyScore >= 0.2).length;

  metrics.skus.textContent = String(inventory.length);
  metrics.lowStock.textContent = String(lowStockCount);
  metrics.anomalies.textContent = String(anomalyCount);
  metrics.alerts.textContent = String(alerts.length);
}

function renderInventory() {
  inventoryBodyEl.innerHTML = '';

  for (const item of inventory) {
    const status = classifyStatus(item);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.sku}</td>
      <td>${item.name}</td>
      <td>${item.stock}</td>
      <td>${item.reorderPoint}</td>
      <td>${item.avgDailySales}</td>
      <td>${item.leadTimeDays}d</td>
      <td><span class="badge badge-${status}">${status}</span></td>
    `;
    inventoryBodyEl.appendChild(row);
  }

  webhookSkuEl.innerHTML = '';
  for (const item of inventory) {
    const option = document.createElement('option');
    option.value = item.sku;
    option.textContent = `${item.sku} · ${item.name}`;
    webhookSkuEl.appendChild(option);
  }

  renderMetrics();
}

function renderRules() {
  rulesListEl.innerHTML = '';

  for (const rule of rules) {
    const li = document.createElement('li');
    li.className = 'rule-item';
    li.innerHTML = `
      <div>
        <strong>IF ${rule.condition}</strong> = ${rule.value}<br />
        <span class="muted">THEN ${rule.action}</span>
      </div>
      <button data-id="${rule.id}" class="danger">Delete</button>
    `;
    rulesListEl.appendChild(li);
  }

  rulesListEl.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = rules.findIndex((r) => r.id === btn.dataset.id);
      if (index >= 0) {
        rules.splice(index, 1);
        renderRules();
      }
    });
  });
}

function renderPredictions() {
  predictionBodyEl.innerHTML = '';

  for (const item of inventory) {
    const demandLeadTime = item.avgDailySales * item.leadTimeDays;
    const volatilityBuffer = Math.ceil(demandLeadTime * item.volatility);
    const recommendedOrder = Math.max(0, demandLeadTime + volatilityBuffer - item.stock);

    const confidence = Math.max(0.55, 0.96 - item.volatility).toFixed(2);
    const risk = recommendedOrder === 0 ? 'low' : recommendedOrder > item.reorderPoint ? 'medium' : 'high';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.sku}</td>
      <td>${recommendedOrder}</td>
      <td>${confidence}</td>
      <td><span class="badge badge-${risk}">${risk}</span></td>
    `;
    predictionBodyEl.appendChild(row);

    if (recommendedOrder > 0 && item.stock <= item.reorderPoint) {
      pushAlert(`Restock recommendation for ${item.sku}: order ${recommendedOrder} units`, 'warning');
    }
  }
}

function evaluateRules(event) {
  for (const rule of rules) {
    const value = Number(rule.value);

    if (rule.condition === 'stock_below') {
      const threshold = Number.isFinite(value) ? value : MIN_STOCK_DEFAULT;
      if ((event.item?.stock ?? Infinity) < threshold) {
        pushAlert(`Rule fired (${rule.action}) for ${event.sku}: stock ${event.item.stock} < ${threshold}`, 'critical');
      }
    }

    if (rule.condition === 'anomaly_above') {
      const threshold = Number.isFinite(value) ? value : 0.2;
      if ((event.item?.anomalyScore ?? 0) > threshold) {
        pushAlert(`Rule fired (${rule.action}) for ${event.sku}: anomaly ${event.item.anomalyScore.toFixed(2)} > ${threshold}`, 'critical');
      }
    }

    if (rule.condition === 'event_type') {
      if (String(rule.value).trim().toLowerCase() === String(event.type).toLowerCase()) {
        pushAlert(`Rule fired (${rule.action}) for event type ${event.type}`, 'info');
      }
    }
  }
}

function applyWebhookEvent({ sku, type, delta }) {
  const item = inventory.find((entry) => entry.sku === sku);
  if (!item) return;

  if (type === 'sale') {
    item.stock = Math.max(0, item.stock - Math.abs(delta));
    item.anomalyScore = Math.min(1, item.anomalyScore + 0.02);
  } else if (type === 'restock') {
    item.stock = item.stock + Math.abs(delta);
    item.anomalyScore = Math.max(0, item.anomalyScore - 0.03);
  } else if (type === 'correction') {
    item.stock = Math.max(0, item.stock + delta);
  } else if (type === 'anomaly') {
    item.anomalyScore = Math.min(1, item.anomalyScore + 0.12);
  }

  const event = {
    sku,
    type,
    delta,
    item,
    message: `${sku} ${type} delta=${delta}, stock=${item.stock}, anomaly=${item.anomalyScore.toFixed(2)}`,
    timestamp: new Date().toLocaleTimeString(),
  };

  appendEventLog(event);
  evaluateRules(event);

  if (item.stock <= item.reorderPoint) {
    pushAlert(`${sku} low stock: ${item.stock} <= reorder point ${item.reorderPoint}`, 'warning');
  }

  if (item.anomalyScore >= 0.2) {
    pushAlert(`${sku} anomaly detected score=${item.anomalyScore.toFixed(2)}`, 'critical');
  }

  renderInventory();
}

function randomEventTick() {
  const pick = inventory[Math.floor(Math.random() * inventory.length)];
  const types = ['sale', 'restock', 'anomaly'];
  const type = types[Math.floor(Math.random() * types.length)];
  const delta = type === 'sale' ? Math.ceil(Math.random() * 6) : Math.ceil(Math.random() * 12);

  applyWebhookEvent({
    sku: pick.sku,
    type,
    delta,
  });
}

function setSyncStatus(text) {
  syncStatusEl.textContent = `sync: ${text}`;
}

document.getElementById('refresh-dashboard').addEventListener('click', () => {
  renderInventory();
  pushAlert('Dashboard refreshed manually', 'info');
});

document.getElementById('rule-form').addEventListener('submit', (event) => {
  event.preventDefault();

  const condition = document.getElementById('rule-condition').value;
  const value = document.getElementById('rule-value').value;
  const action = document.getElementById('rule-action').value;

  rules.unshift({
    id: crypto.randomUUID(),
    condition,
    value,
    action,
  });

  renderRules();
  pushAlert(`Rule added: IF ${condition}=${value} THEN ${action}`, 'info');
  event.target.reset();
});

document.getElementById('webhook-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const sku = webhookSkuEl.value;
  const type = document.getElementById('webhook-type').value;
  const delta = Number(document.getElementById('webhook-delta').value);

  applyWebhookEvent({ sku, type, delta });
});

document.getElementById('run-predictor').addEventListener('click', () => {
  renderPredictions();
  setSyncStatus('predictor completed');
});

document.getElementById('clear-alerts').addEventListener('click', () => {
  alerts.length = 0;
  renderAlerts();
  renderMetrics();
});

document.getElementById('start-sim').addEventListener('click', () => {
  if (timer) return;
  timer = setInterval(randomEventTick, 2200);
  setSyncStatus('streaming');
  pushAlert('Real-time stream started', 'info');
});

document.getElementById('pause-sim').addEventListener('click', () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  setSyncStatus('paused');
});

document.getElementById('step-sim').addEventListener('click', () => {
  randomEventTick();
  setSyncStatus('single event processed');
});

function renderAlerts() {
  alertsListEl.innerHTML = '';
  for (const alert of alerts) {
    const li = document.createElement('li');
    li.className = `alert alert-${alert.level}`;
    li.innerHTML = `${alert.message}<span>${new Date(alert.timestamp).toLocaleTimeString()}</span>`;
    alertsListEl.appendChild(li);
  }

  if (alerts.length === 0) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No active alerts.';
    alertsListEl.appendChild(li);
  }
}

renderInventory();
renderRules();
renderPredictions();
renderAlerts();
setSyncStatus('ready');
appendEventLog({
  type: 'init',
  message: 'FlowPilot initialized with seeded inventory data',
  timestamp: new Date().toLocaleTimeString(),
});
