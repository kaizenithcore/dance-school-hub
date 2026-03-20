/**
 * Simple in-memory IP-based rate limiter for demo tenant endpoints.
 *
 * NOTE: This uses module-level state and resets on process restart.
 * For multi-instance / serverless deployments, replace with an
 * Upstash Redis-backed solution (e.g. @upstash/ratelimit).
 */

interface BucketEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000; // 1 minute sliding window
const MAX_REQUESTS = 40; // requests per IP per window

const buckets = new Map<string, BucketEntry>();

// Purge stale entries every 5 minutes to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, 5 * 60_000).unref?.();

/**
 * Returns true when the IP has exceeded the request quota.
 * Side-effect: increments the counter.
 */
export function isDemoRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = buckets.get(ip);

  if (!entry || now > entry.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REQUESTS;
}

/**
 * Extracts the best-effort client IP from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
