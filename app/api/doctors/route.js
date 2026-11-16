import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/doctors
 * Authenticated clinical directory of hospital doctors and specialists.
 * Accessible to receptionist, doctor, admin, pharmacist, lab-technician, and patient roles.
 */
export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, [
      'admin',
      'doctor',
      'receptionist',
      'pharmacist',
      'lab-technician',
      'patient',
    ]);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') || '';
    const specialization = searchParams.get('specialization') || '';
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

    const query = {
      role: 'doctor',
      isActive: { $ne: false },
    };

    if (department && department.toLowerCase() !== 'all') {
      query.department = new RegExp(escapeRegex(department), 'i');
    }

    if (specialization && specialization.toLowerCase() !== 'all') {
      query.specialization = new RegExp(escapeRegex(specialization), 'i');
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { name: searchRegex },
        { department: searchRegex },
        { specialization: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
      ];
    }

    const doctors = await User.find(query)
      .select('-password -__v')
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: doctors.length,
        doctors,
        staff: doctors, // Backward compatibility with frontends expecting staff
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error retrieving clinical doctor directory');
  }
}

