import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RateLimitConfig } from '../config/loader';

describe('ratelimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function loadModule() {
    return await import('./ratelimit');
  }

  // --- RPM (token bucket) ---

  describe('rpm', () => {
    const rpmConfig: RateLimitConfig = { type: 'rpm', limit: 60 };

    it('allows request within limit', async () => {
      const { checkRateLimit } = await loadModule();
      const result = checkRateLimit('svc-a', rpmConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });

    it('drains tokens sequentially', async () => {
      const { checkRateLimit } = await loadModule();
      const cfg: RateLimitConfig = { type: 'rpm', limit: 10 };
      for (let i = 0; i < 5; i++) {
        checkRateLimit('svc-b', cfg);
      }
      const result = checkRateLimit('svc-b', cfg);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('rejects when bucket exhausted', async () => {
      const { checkRateLimit } = await loadModule();
      const cfg: RateLimitConfig = { type: 'rpm', limit: 10 };
      for (let i = 0; i < 10; i++) {
        checkRateLimit('svc-c', cfg);
      }
      const result = checkRateLimit('svc-c', cfg);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.remaining).toBe(0);
    });

    it('refills tokens after time advance', async () => {
      const { checkRateLimit } = await loadModule();
      const cfg: RateLimitConfig = { type: 'rpm', limit: 10 };
      for (let i = 0; i < 10; i++) {
        checkRateLimit('svc-d', cfg);
      }
      vi.advanceTimersByTime(30_000);
      const result = checkRateLimit('svc-d', cfg);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('does not overflow past limit cap', async () => {
      const { getRateLimitStatus } = await loadModule();
      const cfg: RateLimitConfig = { type: 'rpm', limit: 10 };
      vi.advanceTimersByTime(300_000);
      const status = getRateLimitStatus('svc-e', cfg);
      expect(status.remaining).toBe(10);
      expect(status.limit).toBe(10);
      expect(status.type).toBe('rpm');
    });

    it('calculates retryAfterMs accurately', async () => {
      const { checkRateLimit } = await loadModule();
      const cfg: RateLimitConfig = { type: 'rpm', limit: 60 };
      for (let i = 0; i < 60; i++) {
        checkRateLimit('svc-f', cfg);
      }
      const result = checkRateLimit('svc-f', cfg);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBe(1000);
    });

    it('tracks separate buckets per service', async () => {
      const { checkRateLimit } = await loadModule();
      const cfg: RateLimitConfig = { type: 'rpm', limit: 5 };
      for (let i = 0; i < 5; i++) {
        checkRateLimit('svc-g', cfg);
      }
      expect(checkRateLimit('svc-g', cfg).allowed).toBe(false);
      expect(checkRateLimit('svc-h', cfg).allowed).toBe(true);
    });
  });

  // --- Concurrency ---

  describe('concurrency', () => {
    const concConfig: RateLimitConfig = { type: 'concurrency', limit: 2 };

    it('allows requests up to concurrency limit', async () => {
      const { checkRateLimit } = await loadModule();
      const r1 = checkRateLimit('conc-a', concConfig);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(1);

      const r2 = checkRateLimit('conc-a', concConfig);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);
    });

    it('rejects when max concurrent reached', async () => {
      const { checkRateLimit } = await loadModule();
      checkRateLimit('conc-b', concConfig);
      checkRateLimit('conc-b', concConfig);
      const r3 = checkRateLimit('conc-b', concConfig);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it('allows again after release', async () => {
      const { checkRateLimit, releaseConcurrency } = await loadModule();
      checkRateLimit('conc-c', concConfig);
      checkRateLimit('conc-c', concConfig);
      expect(checkRateLimit('conc-c', concConfig).allowed).toBe(false);

      releaseConcurrency('conc-c');
      const r4 = checkRateLimit('conc-c', concConfig);
      expect(r4.allowed).toBe(true);
    });

    it('release does not go below zero', async () => {
      const { releaseConcurrency, checkRateLimit } = await loadModule();
      // Release before any acquire — should be safe
      releaseConcurrency('conc-d');
      const r = checkRateLimit('conc-d', concConfig);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(1);
    });

    it('getRateLimitStatus shows concurrency info', async () => {
      const { checkRateLimit, getRateLimitStatus } = await loadModule();
      checkRateLimit('conc-e', concConfig);
      const status = getRateLimitStatus('conc-e', concConfig);
      expect(status.remaining).toBe(1);
      expect(status.limit).toBe(2);
      expect(status.type).toBe('concurrency');
    });
  });

  // --- None ---

  describe('none', () => {
    const noneConfig: RateLimitConfig = { type: 'none' };

    it('always allows', async () => {
      const { checkRateLimit } = await loadModule();
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit('none-a', noneConfig);
        expect(result.allowed).toBe(true);
      }
    });

    it('remaining is Infinity', async () => {
      const { checkRateLimit } = await loadModule();
      const result = checkRateLimit('none-b', noneConfig);
      expect(result.remaining).toBe(Infinity);
    });

    it('getRateLimitStatus shows unlimited', async () => {
      const { getRateLimitStatus } = await loadModule();
      const status = getRateLimitStatus('none-c', noneConfig);
      expect(status.remaining).toBe(Infinity);
      expect(status.limit).toBe(null);
      expect(status.type).toBe('none');
    });
  });
});
