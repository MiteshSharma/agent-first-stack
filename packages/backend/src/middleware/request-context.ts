import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';

export async function requestContextPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request) => {
    // Use existing correlation ID from header or generate a new one
    const correlationId = (request.headers['x-correlation-id'] as string) || crypto.randomUUID();

    request.headers['x-correlation-id'] = correlationId;

    // Add correlation ID to logger context
    request.log = request.log.child({ correlationId });
  });

  app.addHook('onSend', async (request, reply) => {
    const correlationId = request.headers['x-correlation-id'] as string;
    if (correlationId) {
      reply.header('x-correlation-id', correlationId);
    }
  });
}
