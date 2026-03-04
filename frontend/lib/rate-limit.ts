/**
 * lib/rate-limit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Per-agent rate limiting with sliding window algorithm
 *
 * Strategy:
 *   - Production: Cloudflare KV tracks API calls per agent
 *   - Development: In-memory map with cleanup
 *
 * Limits (configurable):
 *   - Standard: 100 requests per minute
 *   - Burst: 500 requests per hour
 *   - Long-term: 10,000 requests per day
 *
 * KV key design:
 *   ratelimit:agent:{agentId}:minute    → JSON array of timestamps (last 60s)
 *   ratelimit:agent:{agentId}:hour      → JSON array of timestamps (last 3600s)
 *   ratelimit:agent:{agentId}:day       → JSON array of timestamps (last 86400s)
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

async function getKV(): Promise<KVNamespace | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kv = (ctx as any).env?.USERS_KV as KVNamespace | undefined;
    return kv ?? null;
  } catch {
    return null;
  }
}

// In-memory rate limit cache
interface RateLimitWindow {
  timestamps: number[];
  expiresAt: number;
}

const rateLimitCache = new Map<string, RateLimitWindow>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of rateLimitCache.entries()) {
    if (window.expiresAt < now) {
      rateLimitCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  minuteLimit?: number;  // Per minute
  hourLimit?: number;    // Per hour
  dayLimit?: number;     // Per day
}

// Default limits (can be overridden per agent)
const DEFAULT_LIMITS: RateLimitConfig = {
  minuteLimit: 100,
  hourLimit: 500,
  dayLimit: 10000,
};

/**
 * Get timestamps from KV or cache
 */
async function getWindow(
  agentId: string,
  window: "minute" | "hour" | "day"
): Promise<number[]> {
  const key = `ratelimit:agent:${agentId}:${window}`;

  // Try KV first
  const kv = await getKV();
  if (kv) {
    try {
      const data = await kv.get(key);
      if (data) {
        return JSON.parse(data) as number[];
      }
    } catch (err) {
      console.error("[rate-limit] Failed to read from KV:", err);
    }
  }

  // Try cache
  const cached = rateLimitCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.timestamps;
  }

  return [];
}

/**
 * Store timestamps in KV or cache
 */
async function setWindow(
  agentId: string,
  window: "minute" | "hour" | "day",
  timestamps: number[]
): Promise<void> {
  const key = `ratelimit:agent:${agentId}:${window}`;

  // Determine TTL based on window
  const ttlSeconds =
    window === "minute" ? 60 : window === "hour" ? 3600 : 86400;

  // Try KV first
  const kv = await getKV();
  if (kv) {
    try {
      await kv.put(key, JSON.stringify(timestamps), {
        expirationTtl: ttlSeconds,
      });
      return;
    } catch (err) {
      console.error("[rate-limit] Failed to write to KV:", err);
    }
  }

  // Fall back to cache
  rateLimitCache.set(key, {
    timestamps,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Check if agent is within rate limits
 * Returns { allowed: boolean, remaining: number, resetAt: string }
 */
export async function checkRateLimit(
  agentId: string,
  config?: RateLimitConfig
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: string;
  limitType?: "minute" | "hour" | "day";
}> {
  const limits = { ...DEFAULT_LIMITS, ...config };
  const now = Date.now();

  // Check minute window
  if (limits.minuteLimit !== undefined) {
    const minuteWindow = now - 60 * 1000;
    const minuteTimestamps = await getWindow(agentId, "minute");
    const recentCalls = minuteTimestamps.filter(ts => ts > minuteWindow);

    if (recentCalls.length >= limits.minuteLimit) {
      const nextReset = new Date(
        Math.max(...recentCalls) + 60 * 1000
      ).toISOString();
      return {
        allowed: false,
        remaining: 0,
        resetAt: nextReset,
        limitType: "minute",
      };
    }

    // Update minute window
    recentCalls.push(now);
    await setWindow(agentId, "minute", recentCalls);
  }

  // Check hour window
  if (limits.hourLimit !== undefined) {
    const hourWindow = now - 60 * 60 * 1000;
    const hourTimestamps = await getWindow(agentId, "hour");
    const recentCalls = hourTimestamps.filter(ts => ts > hourWindow);

    if (recentCalls.length >= limits.hourLimit) {
      const nextReset = new Date(
        Math.max(...recentCalls) + 60 * 60 * 1000
      ).toISOString();
      return {
        allowed: false,
        remaining: 0,
        resetAt: nextReset,
        limitType: "hour",
      };
    }

    // Update hour window
    recentCalls.push(now);
    await setWindow(agentId, "hour", recentCalls);
  }

  // Check day window
  if (limits.dayLimit !== undefined) {
    const dayWindow = now - 24 * 60 * 60 * 1000;
    const dayTimestamps = await getWindow(agentId, "day");
    const recentCalls = dayTimestamps.filter(ts => ts > dayWindow);

    if (recentCalls.length >= limits.dayLimit) {
      const nextReset = new Date(
        Math.max(...recentCalls) + 24 * 60 * 60 * 1000
      ).toISOString();
      return {
        allowed: false,
        remaining: 0,
        resetAt: nextReset,
        limitType: "day",
      };
    }

    // Update day window
    recentCalls.push(now);
    await setWindow(agentId, "day", recentCalls);
  }

  // All checks passed
  const minuteTimestamps = (await getWindow(agentId, "minute")).filter(
    ts => ts > now - 60 * 1000
  );
  const minuteRemaining = limits.minuteLimit ? limits.minuteLimit - minuteTimestamps.length : -1;

  return {
    allowed: true,
    remaining: minuteRemaining,
    resetAt: new Date(now + 60 * 1000).toISOString(),
  };
}

/**
 * Reset rate limits for an agent (admin operation)
 */
export async function resetRateLimits(agentId: string): Promise<void> {
  const kv = await getKV();
  if (kv) {
    try {
      await Promise.all([
        kv.delete(`ratelimit:agent:${agentId}:minute`),
        kv.delete(`ratelimit:agent:${agentId}:hour`),
        kv.delete(`ratelimit:agent:${agentId}:day`),
      ]);
    } catch (err) {
      console.error("[rate-limit] Failed to reset limits in KV:", err);
    }
  }

  // Clear cache
  rateLimitCache.delete(`ratelimit:agent:${agentId}:minute`);
  rateLimitCache.delete(`ratelimit:agent:${agentId}:hour`);
  rateLimitCache.delete(`ratelimit:agent:${agentId}:day`);
}

/**
 * Get current rate limit status for an agent
 */
export async function getRateLimitStatus(agentId: string): Promise<{
  minute: { used: number; limit: number; remaining: number };
  hour: { used: number; limit: number; remaining: number };
  day: { used: number; limit: number; remaining: number };
}> {
  const now = Date.now();

  const minuteTimestamps = (await getWindow(agentId, "minute")).filter(
    ts => ts > now - 60 * 1000
  );
  const hourTimestamps = (await getWindow(agentId, "hour")).filter(
    ts => ts > now - 60 * 60 * 1000
  );
  const dayTimestamps = (await getWindow(agentId, "day")).filter(
    ts => ts > now - 24 * 60 * 60 * 1000
  );

  return {
    minute: {
      used: minuteTimestamps.length,
      limit: DEFAULT_LIMITS.minuteLimit || 100,
      remaining: (DEFAULT_LIMITS.minuteLimit || 100) - minuteTimestamps.length,
    },
    hour: {
      used: hourTimestamps.length,
      limit: DEFAULT_LIMITS.hourLimit || 500,
      remaining: (DEFAULT_LIMITS.hourLimit || 500) - hourTimestamps.length,
    },
    day: {
      used: dayTimestamps.length,
      limit: DEFAULT_LIMITS.dayLimit || 10000,
      remaining: (DEFAULT_LIMITS.dayLimit || 10000) - dayTimestamps.length,
    },
  };
}
