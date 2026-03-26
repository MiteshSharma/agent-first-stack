import type { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { env } from '../lib/env';
import { setRedisClient } from '../lib/cache';

export async function redisPlugin(app: FastifyInstance): Promise<void> {
  if (!env.REDIS_URL) {
    app.log.warn(
      'REDIS_URL not set — running without Redis (cache disabled, rate-limit in-memory)',
    );
    setRedisClient(null);
    return;
  }

  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      connectTimeout: 5000,
    });

    await client.connect();
    app.log.info('Redis connected');

    setRedisClient(client);

    app.addHook('onClose', async () => {
      await client.quit();
      setRedisClient(null);
      app.log.info('Redis disconnected');
    });
  } catch (err) {
    app.log.warn({ err }, 'Redis connection failed — running without Redis');
    setRedisClient(null);
  }
}
