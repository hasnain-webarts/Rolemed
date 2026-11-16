import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rateLimit';

describe('In-Memory Rate Limiter (RM-SEC-005)', () => {
  it('allows requests within normal rate limit threshold', () => {
    const req = new Request('http://localhost:3000/api/auth/signin', {
      headers: new Headers({ 'x-forwarded-for': '192.168.1.100' }),
    });

    const res = checkRateLimit(req, { maxRequests: 5, windowMs: 10000 });
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
  });

  it('rejects burst requests that exceed maximum threshold with allowed: false', () => {
    const ip = '192.168.1.250';
    let lastRes = null;

    // Send 6 requests with maxRequests = 5
    for (let i = 0; i < 6; i++) {
      const req = new Request('http://localhost:3000/api/auth/signin', {
        headers: new Headers({ 'x-forwarded-for': ip }),
      });
      lastRes = checkRateLimit(req, { maxRequests: 5, windowMs: 10000 });
    }

    expect(lastRes.allowed).toBe(false);
    expect(lastRes.remaining).toBe(0);
  });

  it('bypasses rate limit when valid internal test service key is provided', () => {
    process.env.NEXTAUTH_SECRET = 'hospital-rate-limit-test-secret';
    const req = new Request('http://localhost:3000/api/auth/signin', {
      headers: new Headers({
        'x-forwarded-for': '10.0.0.99',
        'x-internal-key': 'hospital-rate-limit-test-secret',
      }),
    });

    for (let i = 0; i < 20; i++) {
      const res = checkRateLimit(req, { maxRequests: 2, windowMs: 10000 });
      expect(res.allowed).toBe(true);
    }
  });
});

