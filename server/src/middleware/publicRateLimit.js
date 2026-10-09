export function createRateLimiter({ windowMs = 60_000, maxRequests = 60 } = {}) {
  const buckets = new Map();
  return function rateLimit(req, res, next) {
    const now = Date.now(), key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) buckets.set(key, { start: now, count: 1 });
    else if (++bucket.count > maxRequests) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    if (buckets.size > 2000) for (const [ip, item] of buckets) if (now - item.start > windowMs) buckets.delete(ip);
    next();
  };
}

export const publicRateLimit = createRateLimiter();
export const authRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
export const registerRateLimit = createRateLimiter({ windowMs: 60 * 60_000, maxRequests: 5 });
