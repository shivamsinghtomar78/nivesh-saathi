import { Redis } from "@upstash/redis";

import { hasUpstashConfig } from "@/lib/server/env";

type MemoryEntry = {
  value: unknown;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryEntry>();

let redisClient: Redis | null = null;

function getRedisClient() {
  if (!hasUpstashConfig) {
    return null;
  }

  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }

  return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      return cached ?? null;
    } catch {
      // Fall through to the in-memory cache in local/dev cases.
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
      return;
    } catch {
      // Fall through to the in-memory cache in local/dev cases.
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
