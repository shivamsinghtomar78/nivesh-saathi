import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { hasUpstashConfig } from "@/lib/server/env";

type RateLimitOptions = {
  key: string;
  limit: number;
  window: `${number} s` | `${number} m` | `${number} h`;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type MemoryBucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();

const ratelimitClients = new Map<string, Ratelimit>();

function getRatelimitClient(options: RateLimitOptions) {
  if (!hasUpstashConfig) {
    return null;
  }

  const clientKey = `${options.limit}:${options.window}`;
  const existing = ratelimitClients.get(clientKey);
  if (existing) {
    return existing;
  }

  const nextClient = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(options.limit, options.window),
    analytics: true,
    prefix: "nivesh-saathi",
  });

  ratelimitClients.set(clientKey, nextClient);
  return nextClient;
}

function parseWindowMs(window: RateLimitOptions["window"]) {
  const [value, unit] = window.split(" ");
  const amount = Number(value);

  if (unit === "s") {
    return amount * 1000;
  }

  if (unit === "h") {
    return amount * 60 * 60 * 1000;
  }

  return amount * 60 * 1000;
}

export async function enforceRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const client = getRatelimitClient(options);

  if (client) {
    const result = await client.limit(options.key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  const windowMs = parseWindowMs(options.window);
  const now = Date.now();
  const bucket = memoryBuckets.get(options.key);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(options.key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: now + windowMs,
    };
  }

  bucket.count += 1;
  memoryBuckets.set(options.key, bucket);

  return {
    success: bucket.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    reset: bucket.resetAt,
  };
}
