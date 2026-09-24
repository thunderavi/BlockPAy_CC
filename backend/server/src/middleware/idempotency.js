const idempotencyCache = new Map();

// Expire old idempotency keys every 10 minutes (TTL 2 hours)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > 2 * 60 * 60 * 1000) {
      idempotencyCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Middleware to ensure request idempotency for payment & refund mutations
 */
export function idempotency(req, res, next) {
  const key = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  if (!key) {
    return next();
  }

  const cached = idempotencyCache.get(key);
  if (cached) {
    if (cached.inFlight) {
      return res.status(409).json({ message: "A request with this idempotency key is currently processing" });
    }
    return res.status(cached.status).json(cached.body);
  }

  idempotencyCache.set(key, { inFlight: true, timestamp: Date.now() });

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    idempotencyCache.set(key, {
      inFlight: false,
      status: res.statusCode,
      body,
      timestamp: Date.now()
    });
    return originalJson(body);
  };

  next();
}
