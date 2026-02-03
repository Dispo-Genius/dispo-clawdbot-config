import type { RateLimitConfig } from '../config/loader';
import { getDb } from '../db/migrate';

const STALE_CONCURRENCY_MS = 10 * 60 * 1000; // 10 minutes

// --- RPM: SQLite-backed Token Bucket ---

function consumeToken(service: string, ratePerMinute: number): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const db = getDb();
  const now = Date.now();

  const result = db.transaction(() => {
    const row = db.prepare('SELECT tokens, last_refill_at, rate_per_minute FROM rate_limit_buckets WHERE service = ?').get(service) as
      | { tokens: number; last_refill_at: number; rate_per_minute: number }
      | undefined;

    let tokens: number;
    let lastRefill: number;

    if (!row) {
      // First invocation: initialize full bucket
      tokens = ratePerMinute;
      lastRefill = now;
    } else {
      const elapsed = now - row.last_refill_at;
      const tokensToAdd = (elapsed / 60000) * ratePerMinute;
      tokens = Math.min(ratePerMinute, row.tokens + tokensToAdd);
      lastRefill = now;
    }

    if (tokens >= 1) {
      tokens -= 1;
      db.prepare(
        'INSERT INTO rate_limit_buckets (service, tokens, last_refill_at, rate_per_minute) VALUES (?, ?, ?, ?) ON CONFLICT(service) DO UPDATE SET tokens = excluded.tokens, last_refill_at = excluded.last_refill_at, rate_per_minute = excluded.rate_per_minute'
      ).run(service, tokens, lastRefill, ratePerMinute);
      return { allowed: true, remaining: Math.floor(tokens) };
    }

    // Not enough tokens — persist refill state but don't consume
    db.prepare(
      'INSERT INTO rate_limit_buckets (service, tokens, last_refill_at, rate_per_minute) VALUES (?, ?, ?, ?) ON CONFLICT(service) DO UPDATE SET tokens = excluded.tokens, last_refill_at = excluded.last_refill_at, rate_per_minute = excluded.rate_per_minute'
    ).run(service, tokens, lastRefill, ratePerMinute);

    const msPerToken = 60000 / ratePerMinute;
    const deficit = 1 - tokens;
    const retryAfterMs = Math.ceil(deficit * msPerToken);
    return { allowed: false, remaining: 0, retryAfterMs };
  })();

  return result;
}

// --- Concurrency: SQLite-backed ---

function cleanStaleConcurrency(db: ReturnType<typeof getDb>, service: string): void {
  const cutoff = Date.now() - STALE_CONCURRENCY_MS;
  db.prepare('DELETE FROM rate_limit_concurrency WHERE service = ? AND started_at < ?').run(service, cutoff);
}

function acquireConcurrency(service: string, maxConcurrent: number): { allowed: boolean; remaining: number } {
  const db = getDb();

  return db.transaction(() => {
    cleanStaleConcurrency(db, service);
    const row = db.prepare('SELECT COUNT(*) as count FROM rate_limit_concurrency WHERE service = ?').get(service) as { count: number };
    const inFlight = row.count;

    if (inFlight < maxConcurrent) {
      db.prepare('INSERT INTO rate_limit_concurrency (service, pid) VALUES (?, ?)').run(service, process.pid);
      return { allowed: true, remaining: maxConcurrent - inFlight - 1 };
    }

    return { allowed: false, remaining: 0 };
  })();
}

// --- Public API ---

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  remaining: number;
}

export function checkRateLimit(service: string, config: RateLimitConfig): RateLimitResult {
  if (config.type === 'none') {
    return { allowed: true, remaining: Infinity };
  }

  if (config.type === 'concurrency') {
    const max = config.limit ?? 1;
    return acquireConcurrency(service, max);
  }

  // rpm (default)
  const rpm = config.limit ?? 60;
  return consumeToken(service, rpm);
}

export function releaseConcurrency(service: string): void {
  const db = getDb();
  db.prepare('DELETE FROM rate_limit_concurrency WHERE service = ? AND pid = ?').run(service, process.pid);
}

export function getRateLimitStatus(
  service: string,
  config: RateLimitConfig
): { remaining: number; limit: number | null; type: string } {
  if (config.type === 'none') {
    return { remaining: Infinity, limit: null, type: 'none' };
  }

  const db = getDb();

  if (config.type === 'concurrency') {
    const max = config.limit ?? 1;
    cleanStaleConcurrency(db, service);
    const row = db.prepare('SELECT COUNT(*) as count FROM rate_limit_concurrency WHERE service = ?').get(service) as { count: number };
    return { remaining: max - row.count, limit: max, type: 'concurrency' };
  }

  // rpm
  const rpm = config.limit ?? 60;
  const now = Date.now();
  const row = db.prepare('SELECT tokens, last_refill_at FROM rate_limit_buckets WHERE service = ?').get(service) as
    | { tokens: number; last_refill_at: number }
    | undefined;

  if (!row) {
    return { remaining: rpm, limit: rpm, type: 'rpm' };
  }

  const elapsed = now - row.last_refill_at;
  const tokensToAdd = (elapsed / 60000) * rpm;
  const tokens = Math.min(rpm, row.tokens + tokensToAdd);
  return { remaining: Math.floor(tokens), limit: rpm, type: 'rpm' };
}
