import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { getRedisClient } from '../lib/cache';

export async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  const redis = getRedisClient();

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    // Use Redis store if available, falls back to in-memory automatically
    ...(redis
      ? {
          redis,
        }
      : {}),
    keyGenerator: (request) => {
      return request.ip;
    },
  });
}
