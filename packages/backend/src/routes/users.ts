import type { FastifyInstance } from 'fastify';
import {
  CreateUserSchema,
  UpdateUserSchema,
  PaginationSchema,
  IdParamSchema,
} from '@agent-first-stack/shared';
import { UserService } from '../services/user.service';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const userService = new UserService();

  // GET /api/users — list with pagination and search
  app.get('/api/users', async (request, reply) => {
    const query = PaginationSchema.parse(request.query);
    const result = await userService.list(query.page, query.limit, query.search);
    return reply.send(result);
  });

  // GET /api/users/:id — get by ID
  app.get('/api/users/:id', async (request, reply) => {
    const { id } = IdParamSchema.parse(request.params);
    const user = await userService.getById(id);

    if (!user) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return reply.send(user);
  });

  // POST /api/users — create
  app.post('/api/users', async (request, reply) => {
    const data = CreateUserSchema.parse(request.body);
    const user = await userService.create(data);
    return reply.status(201).send(user);
  });

  // PUT /api/users/:id — update
  app.put('/api/users/:id', async (request, reply) => {
    const { id } = IdParamSchema.parse(request.params);
    const data = UpdateUserSchema.parse(request.body);
    const user = await userService.update(id, data);
    return reply.send(user);
  });

  // DELETE /api/users/:id — delete
  app.delete('/api/users/:id', async (request, reply) => {
    const { id } = IdParamSchema.parse(request.params);
    await userService.delete(id);
    return reply.status(204).send();
  });
}
