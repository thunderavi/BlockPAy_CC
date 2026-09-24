/**
 * Enterprise In-Memory Sliding Window Rate Limiter
 * Provides multi-tier rate limiting for Public, Auth, Customer, Merchant, and Authority endpoints.
 */

class SlidingWindowCounter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map(); // key -> [timestamps]

    // Periodic sweep to prevent memory leak under high distinct IP load
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - this.windowMs;
      for (const [key, timestamps] of this.hits.entries()) {
        const filtered = timestamps.filter((t) => t > cutoff);
        if (filtered.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, filtered);
        }
      }
    }, Math.max(30000, windowMs));

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  check(key) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    let timestamps = this.hits.get(key) || [];
    timestamps = timestamps.filter((t) => t > cutoff);

    const isExceeded = timestamps.length >= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - timestamps.length - (isExceeded ? 0 : 1));
    const oldest = timestamps[0] || now;
    const resetSeconds = Math.ceil((oldest + this.windowMs - now) / 1000);

    if (!isExceeded) {
      timestamps.push(now);
      this.hits.set(key, timestamps);
    }

    return {
      allowed: !isExceeded,
      limit: this.maxRequests,
      remaining,
      resetSeconds: Math.max(1, resetSeconds)
    };
  }
}

export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, keyGenerator = null, message = "Too many requests. Please slow down." } = {}) {
  const counter = new SlidingWindowCounter(windowMs, max);

  return function rateLimiterMiddleware(req, res, next) {
    // Bypass in test runner if requested or via test header
    if (process.env.DISABLE_RATE_LIMIT === "true" || req.headers["x-bypass-rate-limit"] === "true") {
      return next();
    }

    const key = keyGenerator
      ? keyGenerator(req)
      : req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "global";

    const { allowed, limit, remaining, resetSeconds } = counter.check(key);

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (!allowed) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({
        message,
        retryAfterSeconds: resetSeconds
      });
    }

    next();
  };
}

// 1. Auth Limiter (Brute-force protection: 30 attempts per 15 min per IP)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts. Please try again in a few minutes."
});

// 2. Public API Limiter (600 requests per 15 min per IP)
export const publicRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: "Rate limit exceeded for public requests."
});

// 3. Customer / Authenticated Wallet Limiter (1200 requests per 15 min per user)
export const customerRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  keyGenerator: (req) => (req.user?.id ? `user_${req.user.id}` : req.ip || "unknown"),
  message: "User transaction rate limit exceeded."
});

// 4. Merchant API Tier Limiter (3000 requests per 15 min per merchant)
export const merchantRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  keyGenerator: (req) => (req.merchant?._id ? `merchant_${req.merchant._id}` : req.ip || "unknown"),
  message: "Merchant API quota exceeded. Please upgrade tier or throttle requests."
});

// 5. Authority Tier Limiter (5000 requests per 15 min per admin)
export const authorityRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  keyGenerator: (req) => (req.user?.id ? `admin_${req.user.id}` : req.ip || "unknown"),
  message: "Authority API rate limit reached."
});
