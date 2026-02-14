import Fastify from 'fastify';

export type RuleCondition = 'stock_below' | 'anomaly_above' | 'event_type';

export interface AutomationRule {
  id: string;
  condition: RuleCondition;
  value: string;
  action: string;
}

export interface WebhookEvent {
  sku: string;
  eventType: 'sale' | 'restock' | 'correction' | 'anomaly';
  delta: number;
  stock: number;
  anomalyScore: number;
}

export function evaluateRules(rules: AutomationRule[], event: WebhookEvent): string[] {
  const fired: string[] = [];

  for (const rule of rules) {
    if (rule.condition === 'stock_below') {
      const threshold = Number(rule.value);
      if (Number.isFinite(threshold) && event.stock < threshold) {
        fired.push(`${event.sku}: ${rule.action}`);
      }
    }

    if (rule.condition === 'anomaly_above') {
      const threshold = Number(rule.value);
      if (Number.isFinite(threshold) && event.anomalyScore > threshold) {
        fired.push(`${event.sku}: ${rule.action}`);
      }
    }

    if (rule.condition === 'event_type') {
      if (rule.value.toLowerCase() === event.eventType.toLowerCase()) {
        fired.push(`${event.sku}: ${rule.action}`);
      }
    }
  }

  return fired;
}

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/simulate', async (request) => {
    const body = (request.body ?? {}) as {
      objective?: string;
      trigger?: string;
      action?: string;
      guardrail?: string;
    };

    return {
      objective: body.objective ?? 'automation objective',
      timeline: [
        `trigger: ${body.trigger ?? 'event'}`,
        `action: ${body.action ?? 'process task'}`,
        `guardrail: ${body.guardrail ?? 'safety check'}`,
        'audit: trace logged',
      ],
      outcome: 'success',
    };
  });

  app.post('/rules/evaluate', async (request) => {
    const body = (request.body ?? {}) as {
      rules?: AutomationRule[];
      event?: WebhookEvent;
    };

    const rules = body.rules ?? [];
    const event = body.event;

    if (!event) {
      return { alerts: [], error: 'missing event payload' };
    }

    return {
      alerts: evaluateRules(rules, event),
    };
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3000);
  app.listen({ host: '0.0.0.0', port }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
