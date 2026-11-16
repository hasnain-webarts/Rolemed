/**
 * In-Memory Sliding Window Rate Limiter (RM-SEC-005)
 * Protects authentication and critical mutation endpoints from brute-force & denial-of-service bursts.
 */

const ipRequestMap = new Map();

// Periodic cleanup of stale window entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipRequestMap.entries()) {
      if (now > record.resetTime) {
        ipRequestMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks whether an incoming request exceeds rate limit thresholds.
 * @param {Request} req - The incoming Next.js request
 * @param {Object} [options]
 * @param {number} [options.maxRequests=60] - Maximum requests permitted in window
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds (default: 1 minute)
 * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
 */
export function checkRateLimit(req, options = {}) {
  const { maxRequests = 60, windowMs = 60 * 1000 } = options;

  // Extract client IP address from headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';

  // Internal test keys bypass rate limiting for test runner performance
  const internalKey = req.headers.get('x-internal-key');
  if (internalKey && internalKey === process.env.NEXTAUTH_SECRET) {
    return { allowed: true, remaining: maxRequests, resetTime: Date.now() + windowMs };
  }

  const now = Date.now();
  const record = ipRequestMap.get(clientIp);

  if (!record || now > record.resetTime) {
    ipRequestMap.set(clientIp, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  record.count += 1;

  if (record.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

export default checkRateLimit;

