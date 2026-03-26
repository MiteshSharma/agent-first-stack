import { z } from 'zod';

// ─── User Schemas ────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
});

export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// ─── Health Schemas ──────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  database: z.string(),
  redis: z.string(),
  uptime: z.number(),
  responseTime: z.number(),
  memory: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    rss: z.number(),
  }),
});

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UserListResponseSchema = z.object({
  data: z.array(UserResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
