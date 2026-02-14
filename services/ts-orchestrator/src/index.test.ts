import { describe, expect, it } from 'vitest';

import { buildApp, evaluateRules, type AutomationRule } from './index.js';

describe('evaluateRules', () => {
  const rules: AutomationRule[] = [
    {
      id: '1',
      condition: 'stock_below',
      value: '20',
      action: 'create_restock_ticket',
    },
    {
      id: '2',
      condition: 'anomaly_above',
      value: '0.2',
      action: 'send_ops_alert',
    },
  ];

  it('fires stock and anomaly rules', () => {
    const fired = evaluateRules(rules, {
      sku: 'SKU-1002',
      eventType: 'sale',
      delta: 3,
      stock: 12,
      anomalyScore: 0.28,
    });

    expect(fired.length).toBe(2);
  });
});

describe('buildApp', () => {
  it('returns health endpoint', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('evaluates rules via endpoint', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/rules/evaluate',
      payload: {
        rules: [
          { id: 'r1', condition: 'event_type', value: 'sale', action: 'notify_ops' },
        ],
        event: {
          sku: 'SKU-1001',
          eventType: 'sale',
          delta: 2,
          stock: 30,
          anomalyScore: 0.1,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().alerts).toContain('SKU-1001: notify_ops');
  });
});
