import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import User from '@/models/User';
import escapeRegex from '@/lib/escapeRegex';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * GET /api/staff
 * Authenticated directory of hospital staff and clinical personnel.
 * Accessible to hospital employees (admin, doctor, receptionist, pharmacist, lab-technician).
 */
export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, [
      'admin',
      'doctor',
      'receptionist',
      'pharmacist',
      'lab-technician',
    ]);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || '';
    const department = searchParams.get('department') || '';
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '150', 10), 300);

    const query = {
      isActive: { $ne: false },
    };

    if (role && role.toLowerCase() !== 'all') {
      query.role = role.toLowerCase();
    }

    if (department && department.toLowerCase() !== 'all') {
      query.department = new RegExp(escapeRegex(department), 'i');
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { name: searchRegex },
        { department: searchRegex },
        { employeeId: searchRegex },
        { role: searchRegex },
        { email: searchRegex },
      ];
    }

    const staffList = await User.find(query)
      .select('-password -__v')
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: staffList.length,
        staff: staffList,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error retrieving hospital staff directory');
  }
}

