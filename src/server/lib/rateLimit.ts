const buckets = new Map<string, number[]>();

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

export function consumeToken(
  key: string,
  options: RateLimitOptions = {},
): RateLimitResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;

  if (!key) {
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  const events = buckets.get(key) ?? [];
  const recent = events.filter((timestamp) => timestamp > windowStart);

  if (recent.length >= limit) {
    const first = recent[0] ?? now;
    const retryAfterMs = windowMs - (now - first);
    buckets.set(key, recent);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recent.push(now);
  buckets.set(key, recent);

  return {
    allowed: true,
    remaining: Math.max(0, limit - recent.length),
    retryAfter: 0,
  };
}

export function resetRateLimiter() {
  buckets.clear();
}
