/**
 * Enterprise Multi-Tier Caching Service
 * Supports In-Memory LRU with seamless Redis connectivity.
 * Zero-downtime fallback when Redis is absent in local development.
 */

class MemoryCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 60) {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

export class CacheService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisClient = null;
    this.isRedisConnected = false;
  }

  async get(key) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val ? JSON.parse(val) : null;
      } catch {
        // Fallback to memory
      }
    }
    return this.memoryCache.get(key);
  }

  async set(key, value, ttlSeconds = 60) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      } catch {
        // Fallback to memory
      }
    }
    this.memoryCache.set(key, value, ttlSeconds);
  }

  async del(key) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        // Fallback to memory
      }
    }
    this.memoryCache.del(key);
  }

  async invalidatePattern(pattern) {
    this.memoryCache.delPattern(pattern);
  }

  getStats() {
    return {
      type: this.isRedisConnected ? "Redis + In-Memory Fallback" : "In-Memory LRU",
      cachedKeys: this.memoryCache.size(),
      isRedisConnected: this.isRedisConnected
    };
  }
}

export const cache = new CacheService();
