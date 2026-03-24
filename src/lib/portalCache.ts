const CACHE_PREFIX = "portal-cache";

interface CacheEnvelope<T> {
  cachedAt: number;
  ttlMs: number;
  value: T;
}

function buildCacheKey(key: string): string {
  return `${CACHE_PREFIX}:${key}`;
}

export function readPortalCache<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(buildCacheKey(key));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.cachedAt !== "number" || typeof parsed.ttlMs !== "number") {
      return null;
    }

    if (Date.now() - parsed.cachedAt > parsed.ttlMs) {
      window.localStorage.removeItem(buildCacheKey(key));
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function writePortalCache<T>(key: string, value: T, ttlMs: number): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: CacheEnvelope<T> = {
      cachedAt: Date.now(),
      ttlMs,
      value,
    };

    window.localStorage.setItem(buildCacheKey(key), JSON.stringify(payload));
  } catch {
    // Ignore cache write errors (quota/private mode)
  }
}
