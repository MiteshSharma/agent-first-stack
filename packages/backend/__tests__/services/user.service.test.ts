import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService, ServiceError } from '../../src/services/user.service';

// Mock the repository
vi.mock('../../src/repositories/user.repository', () => {
  const mockRepo = {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
  return { UserRepository: vi.fn(() => mockRepo) };
});

// Mock db to avoid DB connection
vi.mock('../../src/db', () => ({
  db: {},
  pool: { query: vi.fn(), end: vi.fn() },
}));

// Mock cache to avoid Redis
vi.mock('../../src/lib/cache', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
}));

import { UserRepository } from '../../src/repositories/user.repository';

function getMockRepo() {
  return new UserRepository() as unknown as {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
}

describe('UserService', () => {
  let service: UserService;
  let mockRepo: ReturnType<typeof getMockRepo>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
    mockRepo = getMockRepo();
  });

  describe('list', () => {
    it('should return paginated user list', async () => {
      mockRepo.findAll.mockResolvedValue([[mockUser], 1]);

      const result = await service.list(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.data[0].id).toBe(mockUser.id);
      expect(result.data[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should pass search to repository', async () => {
      mockRepo.findAll.mockResolvedValue([[], 0]);

      await service.list(1, 20, 'test');

      expect(mockRepo.findAll).toHaveBeenCalledWith(1, 20, 'test');
    });
  });

  describe('create', () => {
    it('should create a user when email is unique', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockUser);

      const result = await service.create({ email: 'test@example.com', name: 'Test User' });

      expect(result.email).toBe('test@example.com');
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw 409 when email already exists', async () => {
      mockRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.create({ email: 'test@example.com', name: 'Test User' }),
      ).rejects.toThrow(ServiceError);

      try {
        await service.create({ email: 'test@example.com', name: 'Test User' });
      } catch (err) {
        expect((err as ServiceError).statusCode).toBe(409);
      }
    });
  });

  describe('delete', () => {
    it('should delete existing user', async () => {
      mockRepo.delete.mockResolvedValue(true);

      await expect(service.delete(mockUser.id)).resolves.toBeUndefined();
    });

    it('should throw 404 when user not found', async () => {
      mockRepo.delete.mockResolvedValue(false);

      await expect(service.delete('nonexistent')).rejects.toThrow(ServiceError);
    });
  });
});
