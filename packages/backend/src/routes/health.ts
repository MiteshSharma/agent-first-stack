import type { FastifyInstance } from 'fastify';
import { AppDataSource } from '../lib/data-source';
import { getRedisClient, getCacheStats } from '../lib/cache';
import { User } from '../entities/User';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    const start = Date.now();

    // Check database
    let dbStatus = 'connected';
    try {
      await AppDataSource.query('SELECT 1');
    } catch (err) {
      dbStatus = `error: ${err instanceof Error ? err.message : 'unknown'}`;
    }

    // Check Redis (optional — never causes health to fail)
    let redisStatus = 'unavailable';
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.ping();
        redisStatus = 'connected';
      } catch {
        redisStatus = 'unavailable';
      }
    }

    const mem = process.memoryUsage();
    const status = dbStatus === 'connected' ? 'ok' : 'degraded';

    const response = {
      status,
      database: dbStatus,
      redis: redisStatus,
      uptime: process.uptime(),
      responseTime: Date.now() - start,
      memory: {
        heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
        rss: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      },
    };

    const httpStatus = status === 'ok' ? 200 : 503;
    return reply.status(httpStatus).send(response);
  });

  app.get('/metrics', async (_request, reply) => {
    // Database entity counts
    const database: Record<string, number> = {};
    try {
      const userCount = await AppDataSource.getRepository(User).count();
      database.users = userCount;
    } catch {
      database.users = 0;
    }

    // Cache stats (zeros if Redis unavailable)
    const cache = await getCacheStats();

    return reply.send({
      database,
      cache,
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        nodeVersion: process.version,
      },
    });
  });
}
