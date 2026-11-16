import { describe, it, expect, beforeAll } from 'vitest';
import { GET as getDoctors } from '@/app/api/doctors/route';
import { GET as getStaff } from '@/app/api/staff/route';
import { GET as getAdminStaff } from '@/app/api/admin/staff/route';

describe('Clinical Doctors & Staff Directory Route Handlers', () => {
  const TEST_SECRET = 'rolemed-test-secret-1234567890';

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = TEST_SECRET;
  });

  describe('GET /api/doctors', () => {
    it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
      const req = new Request('http://localhost:3000/api/doctors', {
        method: 'GET',
        headers: new Headers({}),
      });

      const res = await getDoctors(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('allows receptionist to query doctors list with HTTP 200', async () => {
      const req = new Request('http://localhost:3000/api/doctors', {
        method: 'GET',
        headers: new Headers({
          'x-internal-key': TEST_SECRET,
          'x-user-role': 'receptionist',
          'x-user-id': 'REC-001',
          'x-user-name': 'Receptionist Desk',
        }),
      });

      const res = await getDoctors(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.doctors)).toBe(true);
      expect(Array.isArray(data.staff)).toBe(true);
      expect(data.count).toBeGreaterThanOrEqual(1);

      // Verify doctor objects contain necessary fields and NO password
      const firstDoc = data.doctors[0];
      expect(firstDoc.name).toBeDefined();
      expect(firstDoc.role).toBe('doctor');
      expect(firstDoc.password).toBeUndefined();
    });

    it('allows patient to query doctors directory with HTTP 200', async () => {
      const req = new Request('http://localhost:3000/api/doctors', {
        method: 'GET',
        headers: new Headers({
          'x-internal-key': TEST_SECRET,
          'x-user-role': 'patient',
          'x-user-id': 'PAT-001',
          'x-user-name': 'Patient User',
        }),
      });

      const res = await getDoctors(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.doctors)).toBe(true);
    });
  });

  describe('GET /api/staff', () => {
    it('rejects unauthenticated requests with HTTP 401', async () => {
      const req = new Request('http://localhost:3000/api/staff', {
        method: 'GET',
        headers: new Headers({}),
      });

      const res = await getStaff(req);
      expect(res.status).toBe(401);
    });

    it('allows receptionist to query hospital staff directory with HTTP 200', async () => {
      const req = new Request('http://localhost:3000/api/staff', {
        method: 'GET',
        headers: new Headers({
          'x-internal-key': TEST_SECRET,
          'x-user-role': 'receptionist',
          'x-user-id': 'REC-001',
        }),
      });

      const res = await getStaff(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.staff)).toBe(true);
      expect(data.count).toBeGreaterThanOrEqual(1);

      // Ensure password field is scrubbed
      const first = data.staff[0];
      expect(first.password).toBeUndefined();
    });
  });

  describe('RBAC Verification: /api/admin/staff remains admin-restricted', () => {
    it('returns 403 Forbidden when receptionist accesses /api/admin/staff', async () => {
      const req = new Request('http://localhost:3000/api/admin/staff', {
        method: 'GET',
        headers: new Headers({
          'x-internal-key': TEST_SECRET,
          'x-user-role': 'receptionist',
          'x-user-id': 'REC-001',
        }),
      });

      const res = await getAdminStaff(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });
  });
});

