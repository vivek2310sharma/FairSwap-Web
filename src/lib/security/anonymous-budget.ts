/**
 * Best-effort abuse budget for unauthenticated server actions.
 *
 * IMPORTANT LIMITS (be honest about them in release notes): state lives in this server instance's memory. On a
 * serverless host each instance has its own counters, so this bounds a single client's work per instance and bounds
 * the total work any one instance does for anonymous callers, but it is NOT a globally consistent rate limit. A
 * proper global limit needs shared infrastructure (for example a Vercel WAF rule or a shared store). No such
 * infrastructure is introduced here; this is defence in depth, not a replacement for it.
 */
export interface BudgetOptions {
  windowMs: number;
  /** Max calls per client key per window. */
  maxRequests: number;
  /** Max cost (for example ids looked up) per client key per window. */
  maxCost: number;
  /** Max cost across all anonymous clients on this instance per window. */
  maxGlobalCost: number;
}

export type BudgetResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

interface Bucket { start: number; requests: number; cost: number }

const MAX_TRACKED_KEYS = 5000;

export function createAnonymousBudget(options: BudgetOptions, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();
  let global: Bucket = { start: now(), requests: 0, cost: 0 };

  return {
    check(key: string, cost = 1): BudgetResult {
      const t = now();
      if (t - global.start >= options.windowMs) global = { start: t, requests: 0, cost: 0 };

      let bucket = buckets.get(key);
      if (!bucket || t - bucket.start >= options.windowMs) {
        bucket = { start: t, requests: 0, cost: 0 };
        // Bounded memory: drop the oldest key rather than grow without limit under a flood of distinct keys.
        if (!buckets.has(key) && buckets.size >= MAX_TRACKED_KEYS) buckets.delete(buckets.keys().next().value as string);
        buckets.delete(key);
        buckets.set(key, bucket);
      }

      const overClient = bucket.requests + 1 > options.maxRequests || bucket.cost + cost > options.maxCost;
      const overGlobal = global.cost + cost > options.maxGlobalCost;
      if (overClient || overGlobal) {
        const resetAt = overClient ? bucket.start + options.windowMs : global.start + options.windowMs;
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - t) / 1000)) };
      }
      bucket.requests += 1;
      bucket.cost += cost;
      global.requests += 1;
      global.cost += cost;
      return { allowed: true };
    },
    /** Test hook. */
    reset() { buckets.clear(); global = { start: now(), requests: 0, cost: 0 }; },
  };
}
