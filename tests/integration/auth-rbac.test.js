import { describe, it, expect, beforeAll } from 'vitest';
import { authenticateRoute } from '@/lib/authGuard';
import { NextResponse } from 'next/server';

describe('Universal Authentication & RBAC Guard (authenticateRoute)', () => {
  const TEST_SECRET = 'rolemed-test-secret-1234567890';

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = TEST_SECRET;
  });

  it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
    const req = new Request('http://localhost:3000/api/patients', {
      method: 'GET',
      headers: new Headers({}),
    });

    const result = await authenticateRoute(req, ['admin', 'doctor']);
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(401);

    const body = await result.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Authentication required');
  });

  it('rejects requests with invalid internal authentication keys with HTTP 401', async () => {
    const req = new Request('http://localhost:3000/api/admin/reports', {
      method: 'GET',
      headers: new Headers({
        'x-internal-key': 'wrong-secret-key',
        'x-user-role': 'admin',
      }),
    });

    const result = await authenticateRoute(req, 'admin');
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(401);
  });

  it('rejects authenticated users lacking the required role with HTTP 403 Forbidden', async () => {
    const req = new Request('http://localhost:3000/api/admin/staff', {
      method: 'GET',
      headers: new Headers({
        'x-internal-key': TEST_SECRET,
        'x-user-role': 'patient',
        'x-user-id': 'PAT-TEST-001',
      }),
    });

    const result = await authenticateRoute(req, 'admin');
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);

    const body = await result.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Forbidden');
    expect(body.error).toContain("Your role 'patient' lacks permission");
  });

  it('allows authenticated users whose role matches allowedRoles', async () => {
    const req = new Request('http://localhost:3000/api/prescriptions', {
      method: 'GET',
      headers: new Headers({
        'x-internal-key': TEST_SECRET,
        'x-user-role': 'pharmacist',
        'x-user-id': 'PHARM-001',
        'x-user-name': 'Dr. Tariq Pharmacy',
      }),
    });

    const result = await authenticateRoute(req, ['pharmacist', 'doctor']);
    // Successful authentication returns plain object { user: ... }
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result.user).toBeDefined();
    expect(result.user.role).toBe('pharmacist');
    expect(result.user.name).toBe('Dr. Tariq Pharmacy');
  });

  it('grants admin role operational override access across clinical endpoints', async () => {
    const req = new Request('http://localhost:3000/api/lab-orders/LAB-001', {
      method: 'GET',
      headers: new Headers({
        'x-internal-key': TEST_SECRET,
        'x-user-role': 'admin',
        'x-user-id': 'ADM-001',
      }),
    });

    // Endpoint only requires lab-technician, but admin has universal administrative override
    const result = await authenticateRoute(req, ['lab-technician']);
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result.user.role).toBe('admin');
  });

  it('allows any authenticated user when allowedRoles is null', async () => {
    const req = new Request('http://localhost:3000/api/profile', {
      method: 'GET',
      headers: new Headers({
        'x-internal-key': TEST_SECRET,
        'x-user-role': 'receptionist',
        'x-user-id': 'REC-001',
      }),
    });

    const result = await authenticateRoute(req, null);
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result.user.role).toBe('receptionist');
  });

  it('blocks x-internal-key bypass when NODE_ENV is production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const req = new Request('http://localhost:3000/api/patients', {
        method: 'GET',
        headers: new Headers({
          'x-internal-key': TEST_SECRET,
          'x-user-role': 'admin',
        }),
      });

      const result = await authenticateRoute(req, 'admin');
      expect(result).toBeInstanceOf(NextResponse);
      expect(result.status).toBe(401);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

