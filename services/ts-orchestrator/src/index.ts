import Fastify from 'fastify';

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
