/**
 * Redis client wrapper — uses in-memory mock when Redis is unavailable.
 * This prevents MaxRetriesPerRequestError from crashing the app.
 */

// In-memory cache mock
const memoryCache = new Map();

const mockRedis = {
  get: async (key) => {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  },
  set: async (key, value) => {
    memoryCache.set(key, { value, expiresAt: null });
    return 'OK';
  },
  setex: async (key, seconds, value) => {
    memoryCache.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  },
  del: async (...keys) => {
    let count = 0;
    for (const key of keys) {
      if (memoryCache.delete(key)) count++;
    }
    return count;
  },
  exists: async (key) => memoryCache.has(key) ? 1 : 0,
  expire: async () => 1,
  keys: async () => [],
  _isMock: true,
};

let redis = mockRedis;

// Only attempt real Redis if REDIS_URL is explicitly set
const config = require('./index');
if (config.redis.url && config.redis.url !== 'redis://localhost:6379') {
  try {
    const Redis = require('ioredis');
    const client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 2) return null; // Stop retrying after 2 attempts
        return Math.min(times * 200, 1000);
      },
      lazyConnect: true,
      connectTimeout: 3000,
    });

    client.on('connect', () => {
      console.log('🔴 Connected to Redis');
      redis = client;
    });

    client.on('error', () => {
      // Silently fall back to mock
    });

    client.connect().catch(() => {
      console.log('📦 Redis unavailable — using in-memory cache');
    });
  } catch {
    // Redis module not available, use mock
  }
} else {
  console.log('📦 Using in-memory cache (no Redis configured)');
}

module.exports = mockRedis;
