import { eq, ilike, or, count, sql } from 'drizzle-orm';
import { db } from '../db';
import { users, type User, type NewUser } from '../db/schema';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from '../lib/cache';

const CACHE_PREFIX = 'user';
const CACHE_TTL = 300; // 5 minutes

export class UserRepository {
  async findAll(page: number, limit: number, search?: string): Promise<[User[], number]> {
    const cacheKey = `${CACHE_PREFIX}:list:${page}:${limit}:${search || ''}`;
    const cached = await cacheGet<{ data: User[]; total: number }>(cacheKey);
    if (cached) return [cached.data, cached.total];

    const offset = (page - 1) * limit;

    const whereClause = search
      ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
      : undefined;

    const [data, [{ total }]] = await Promise.all([
      db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(sql`${users.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(users)
        .where(whereClause),
    ]);

    await cacheSet(cacheKey, { data, total: Number(total) }, CACHE_TTL);
    return [data, Number(total)];
  }

  async findById(id: string): Promise<User | null> {
    const cacheKey = `${CACHE_PREFIX}:${id}`;
    const cached = await cacheGet<User>(cacheKey);
    if (cached) return cached;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (user) {
      await cacheSet(cacheKey, user, CACHE_TTL);
    }
    return user ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async create(data: Pick<NewUser, 'email' | 'name'>): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    await cacheDelPattern(`${CACHE_PREFIX}:list:*`);
    return user;
  }

  async update(id: string, data: Partial<Pick<NewUser, 'email' | 'name'>>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) return null;
    await cacheDel(`${CACHE_PREFIX}:${id}`);
    await cacheDelPattern(`${CACHE_PREFIX}:list:*`);
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    await cacheDel(`${CACHE_PREFIX}:${id}`);
    await cacheDelPattern(`${CACHE_PREFIX}:list:*`);
    return deleted !== undefined;
  }

  async count(): Promise<number> {
    const [{ total }] = await db.select({ total: count() }).from(users);
    return Number(total);
  }
}
