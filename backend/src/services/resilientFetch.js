/**
 * Resilient Ingestion Fetcher & Meteorological Cache
 * - Configurable retries with exponential backoff & random jitter
 * - Per-request AbortSignal timeouts
 * - In-memory TTL / LRU caching layer
 * - Full data provenance & source timestamps (ingestedAt, sourceTimestamp, latencyMs)
 */

class MeteorologicalCache {
  constructor(maxEntries = 500) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses += 1;
      return null;
    }

    this.hits += 1;
    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);

    return {
      data: entry.data,
      ingestedAt: entry.ingestedAt,
      sourceTimestamp: entry.sourceTimestamp,
      cachedAt: entry.cachedAt,
      cacheAgeMs: Date.now() - entry.cachedAt,
      expiresAt: new Date(entry.expiresAt).toISOString(),
    };
  }

  set(key, data, ttlMs, sourceTimestamp = null) {
    // Evict oldest entry if size exceeded
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      ingestedAt: new Date(now).toISOString(),
      sourceTimestamp: sourceTimestamp || new Date(now).toISOString(),
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Number(((this.hits / total) * 100).toFixed(1)) : 0,
    };
  }
}

export const weatherCache = new MeteorologicalCache(600);

/**
 * Resilient HTTP GET client with exponential backoff, jitter, timeouts, and caching
 * @param {string|URL} url Target URL
 * @param {object} options Fetch options
 * @param {object} config Resilience configuration
 * @returns {Promise<object>} JSON payload with provenance timestamps
 */
export async function resilientFetchJson(url, options = {}, config = {}) {
  const {
    cacheKey = null,
    ttlMs = 5 * 60 * 1000, // 5 minutes default forecast TTL
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 3000,
    timeoutMs = 12000,
  } = config;

  // 1. Check cache first
  if (cacheKey) {
    const cached = weatherCache.get(cacheKey);
    if (cached) {
      return {
        data: cached.data,
        provenance: {
          source: "Open-Meteo",
          url: typeof url === "string" ? url : url.toString(),
          ingestedAt: cached.ingestedAt,
          sourceTimestamp: cached.sourceTimestamp,
          cached: true,
          cacheAgeMs: cached.cacheAgeMs,
          cacheExpiresAt: cached.expiresAt,
          attempts: 0,
        },
      };
    }
  }

  // 2. Fetch with exponential backoff retry loop
  let lastError = null;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

      // Merge signals if caller provided one
      const signal = options.signal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal;

      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          "User-Agent": "CloudburstPredictionSystem/2.1 (Meteorological Data Ingestion Engine)",
          ...(options.headers || {}),
        },
        signal,
      });

      clearTimeout(timeoutTimer);

      if (!response.ok) {
        // Rate limited (429) or Server Error (5xx) -> candidate for retry
        const isRetryable =
          response.status === 429 ||
          (response.status >= 500 && response.status <= 599);

        if (isRetryable && attempt <= retries) {
          const retryAfterSec = Number(response.headers.get("Retry-After"));
          const backoff = Math.min(
            maxDelayMs,
            baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 150
          );
          const delay = Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : backoff;

          console.warn(
            `[Meteorological Ingestion] Warning: HTTP ${response.status} from ${url}. Retrying attempt ${attempt}/${retries} in ${Math.round(delay)}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`Open-Meteo API returned HTTP status ${response.status} (${response.statusText})`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const nowIso = new Date().toISOString();

      // Open-Meteo provides generationtime_ms; extract model timestamp if present
      const sourceTimestamp = data.current?.time || data.hourly?.time?.[0] || nowIso;

      // Cache successful response
      if (cacheKey && ttlMs > 0) {
        weatherCache.set(cacheKey, data, ttlMs, sourceTimestamp);
      }

      return {
        data,
        provenance: {
          source: "Open-Meteo",
          url: typeof url === "string" ? url : url.toString(),
          ingestedAt: nowIso,
          sourceTimestamp,
          cached: false,
          cacheAgeMs: 0,
          latencyMs,
          attempts: attempt,
          generationTimeMs: data.generationtime_ms ?? null,
        },
      };
    } catch (err) {
      lastError = err;

      if (attempt <= retries) {
        const backoff = Math.min(
          maxDelayMs,
          baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 150
        );
        console.warn(
          `[Meteorological Ingestion] Network / timeout error on attempt ${attempt}/${retries}: ${err.message}. Retrying in ${Math.round(backoff)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw new Error(
    `Failed to ingest meteorological data after ${retries + 1} attempts: ${lastError?.message || "Unknown error"}`
  );
}

