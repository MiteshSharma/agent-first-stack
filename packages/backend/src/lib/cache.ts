import type Redis from 'ioredis';

/**
 * Cache abstraction with graceful no-op fallback.
 * If Redis is unavailable, all operations silently succeed with no data.
 * This ensures the app works fully without Redis.
 */

let redisClient: Redis | null = null;
let cacheHits = 0;
let cacheMisses = 0;

export function setRedisClient(client: Redis | null): void {
  redisClient = client;
}

export function getRedisClient(): Redis | null {
  return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redisClient) {
    cacheMisses++;
    return null;
  }
  try {
    const value = await redisClient.get(key);
    if (value) {
      cacheHits++;
      return JSON.parse(value) as T;
    }
    cacheMisses++;
    return null;
  } catch {
    cacheMisses++;
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Redis unavailable — no-op
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch {
    // Redis unavailable — no-op
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redisClient) return;
  try {
    // Use SCAN instead of KEYS for production safety (KEYS is O(N) and blocks Redis)
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Redis unavailable — no-op
  }
}

export async function getCacheStats(): Promise<{ hits: number; misses: number; keys: number }> {
  let keys = 0;
  if (redisClient) {
    try {
      keys = await redisClient.dbsize();
    } catch {
      // Redis unavailable
    }
  }
  return { hits: cacheHits, misses: cacheMisses, keys };
}
