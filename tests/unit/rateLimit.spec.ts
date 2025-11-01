import { describe, expect, beforeEach, it } from 'vitest';
import { consumeToken, resetRateLimiter } from '@/server/lib/rateLimit';

describe('rate limiter', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('allows requests under the limit', () => {
    const result = consumeToken('ip:1.2.3.4', { limit: 2, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    const second = consumeToken('ip:1.2.3.4', { limit: 2, windowMs: 1000 });
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks once the limit is exceeded', () => {
    consumeToken('user:abc', { limit: 1, windowMs: 1000 });
    const blocked = consumeToken('user:abc', { limit: 1, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('expires entries after the window elapses', async () => {
    consumeToken('user:timer', { limit: 1, windowMs: 10 });
    await new Promise((resolve) => setTimeout(resolve, 15));
    const allowed = consumeToken('user:timer', { limit: 1, windowMs: 10 });
    expect(allowed.allowed).toBe(true);
  });
});
