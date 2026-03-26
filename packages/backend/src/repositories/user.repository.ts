import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { AppDataSource } from '../lib/data-source';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from '../lib/cache';

const CACHE_PREFIX = 'user';
const CACHE_TTL = 300; // 5 minutes

export class UserRepository {
  private repo: Repository<User>;

  constructor() {
    this.repo = AppDataSource.getRepository(User);
  }

  async findAll(page: number, limit: number, search?: string): Promise<[User[], number]> {
    const cacheKey = `${CACHE_PREFIX}:list:${page}:${limit}:${search || ''}`;
    const cached = await cacheGet<{ data: User[]; total: number }>(cacheKey);
    if (cached) return [cached.data, cached.total];

    const qb = this.repo.createQueryBuilder('user');

    if (search) {
      qb.where('user.name ILIKE :search OR user.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    await cacheSet(cacheKey, { data, total }, CACHE_TTL);
    return [data, total];
  }

  async findById(id: string): Promise<User | null> {
    const cacheKey = `${CACHE_PREFIX}:${id}`;
    const cached = await cacheGet<User>(cacheKey);
    if (cached) return cached;

    const user = await this.repo.findOne({ where: { id } });
    if (user) {
      await cacheSet(cacheKey, user, CACHE_TTL);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data);
    const saved = await this.repo.save(user);
    await cacheDelPattern(`${CACHE_PREFIX}:list:*`);
    return saved;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    await this.repo.update(id, data);
    await cacheDel(`${CACHE_PREFIX}:${id}`);
    await cacheDelPattern(`${CACHE_PREFIX}:list:*`);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    await cacheDel(`${CACHE_PREFIX}:${id}`);
    await cacheDelPattern(`${CACHE_PREFIX}:list:*`);
    return (result.affected ?? 0) > 0;
  }

  async count(): Promise<number> {
    return this.repo.count();
  }
}
