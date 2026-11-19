import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/authOptions';

/**
 * Universal Authentication & Role-Based Authorization Guard for RoleMed RB-HMS API Routes.
 * 
 * Verifies caller identity via:
 * 1. NextAuth session cookie (`getServerSession(authOptions)`)
 * 2. NextAuth JWT bearer / request token (`getToken`)
 * 3. Secure internal service key (`x-internal-key` matching NEXTAUTH_SECRET) for automated test suites
 * 
 * @param {Request} req - The incoming Request
 * @param {string[]|string|null} allowedRoles - Single role, array of allowed roles, or null (any authenticated user)
 * @returns {Promise<{ user: Object } | NextResponse>} - Returns session user on success or NextResponse error
 */
export async function authenticateRoute(req, allowedRoles = null) {
  let user = null;

  // 1. Check for standard NextAuth getServerSession
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      user = session.user;
    }
  } catch {
    // Session retrieval exception
  }

  // 2. Check for NextAuth JWT token directly from request
  if (!user) {
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        user = {
          id: token.id || token.sub,
          email: token.email,
          name: token.name,
          role: token.role,
          department: token.department,
          employeeId: token.employeeId,
          patientId: token.patientId,
        };
      }
    } catch {
      // Token parsing failed
    }
  }

  // 3. Check for internal authorization header (used by secure test runners & system services in dev/test)
  if (!user && process.env.NEXTAUTH_SECRET && process.env.NODE_ENV !== 'production') {
    const internalKey = req.headers.get('x-internal-key') || req.headers.get('x-service-key');
    if (internalKey && internalKey === process.env.NEXTAUTH_SECRET) {
      const testRole = req.headers.get('x-user-role') || 'admin';
      const testUserId = req.headers.get('x-user-id') || 'internal-service-user';
      const testUserName = req.headers.get('x-user-name') || 'System Service';
      const testPatientId = req.headers.get('x-patient-id') || '';
      user = {
        id: testUserId,
        name: testUserName,
        email: 'system@rolemed.local',
        role: testRole,
        department: 'Administration',
        patientId: testPatientId,
      };
    }
  }

  // If no authenticated identity found, return 401
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required. Please sign in to access this hospital API resource.',
      },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  }

  // Role verification
  if (allowedRoles) {
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    // 'admin' role always possesses cross-role operational override in hospital systems
    const hasRole = rolesArray.includes(user.role) || user.role === 'admin';
    if (!hasRole) {
      return NextResponse.json(
        {
          success: false,
          error: `Forbidden. Your role '${user.role}' lacks permission for this endpoint. Required role(s): ${rolesArray.join(', ')}`,
        },
        {
          status: 403,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
      );
    }
  }

  return { user };
}

/**
 * Standardized API error response handler to prevent database schema leakage (CWE-209).
 * 
 * @param {Error} error - Caught error object
 * @param {string} contextMessage - User-safe context message
 * @returns {NextResponse} - Formatted JSON response
 */
export function handleApiError(error, contextMessage = 'An unexpected server error occurred') {
  console.error(`[API Error - ${contextMessage}]:`, error);
  const isDev = process.env.NODE_ENV !== 'production';
  return NextResponse.json(
    {
      success: false,
      error: isDev ? (error.message || contextMessage) : contextMessage,
    },
    {
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  );
}

export default authenticateRoute;

