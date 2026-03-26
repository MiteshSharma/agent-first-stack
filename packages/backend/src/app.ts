import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { corsPlugin } from './plugins/cors';
import { redisPlugin } from './plugins/redis';
import { rateLimitPlugin } from './plugins/rate-limit';
import { swaggerPlugin } from './plugins/swagger';
import { authPlugin } from './plugins/auth';
import { requestContextPlugin } from './middleware/request-context';
import { registerErrorHandler } from './middleware/error-handler';
import { registerRoutes } from './routes';
import { env } from './lib/env';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.isProduction ? 'info' : 'debug',
      ...(env.isDevelopment
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
          }
        : {}),
    },
    trustProxy: env.isProduction,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: env.isProduction ? undefined : false,
  });

  // Plugins — order matters
  await app.register(corsPlugin);
  await app.register(redisPlugin);
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);
  await app.register(authPlugin);

  // Middleware
  await app.register(requestContextPlugin);

  // Error handler
  registerErrorHandler(app as FastifyInstance);

  // Routes
  await app.register(registerRoutes);

  return app as FastifyInstance;
}
