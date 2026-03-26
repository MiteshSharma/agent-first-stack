import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { userRoutes } from './users';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(userRoutes);
}
