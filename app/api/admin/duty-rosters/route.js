import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import DutyRoster from '@/models/DutyRoster';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

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

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') || '';
    const shift = searchParams.get('shift') || '';
    const date = searchParams.get('date') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const query = {};

    if (department && department.toLowerCase() !== 'all') {
      query.department = new RegExp(escapeRegex(department), 'i');
    }

    if (shift && shift.toLowerCase() !== 'all') {
      query.shift = new RegExp(escapeRegex(shift), 'i');
    }

    if (date) {
      query.date = date;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { staffName: searchRegex },
        { department: searchRegex },
        { role: searchRegex },
        { notes: searchRegex },
      ];
    }

    const [rosters, allRosters] = await Promise.all([
      DutyRoster.find(query).sort({ date: -1, createdAt: -1 }).limit(limit).lean(),
      DutyRoster.find({}).select('shift status department').lean(),
    ]);

    const stats = {
      total: allRosters.length,
      morning: allRosters.filter((r) => r.shift?.includes('Morning')).length,
      evening: allRosters.filter((r) => r.shift?.includes('Evening')).length,
      night: allRosters.filter((r) => r.shift?.includes('Night')).length,
      onDuty: allRosters.filter((r) => r.status === 'On Duty').length,
    };

    return NextResponse.json(
      {
        success: true,
        count: rosters.length,
        stats,
        rosters,
        dutyRosters: rosters,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Duty-Rosters GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching duty rosters' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();

    const {
      staffId,
      staffName,
      role = 'Staff Practitioner',
      department = 'General Operations',
      shift = 'Morning (08:00 - 16:00)',
      date = new Date().toISOString().split('T')[0],
      status = 'Scheduled',
      notes = '',
    } = body;

    let finalStaffName = staffName;
    let finalStaffId = staffId;
    let finalRole = role;

    if (staffId && staffId.match(/^[0-9a-fA-F]{24}$/)) {
      const u = await User.findById(staffId).select('name role department').lean();
      if (u) {
        finalStaffName = u.name;
        finalRole = u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : role;
      }
    } else {
      // Fallback: lookup user by staffName
      const u = await User.findOne({ name: new RegExp(escapeRegex(staffName || ''), 'i') }).lean();
      if (u) {
        finalStaffId = u._id;
        finalStaffName = u.name;
      } else {
        // Find default doctor or admin
        const fallbackUser = await User.findOne({ role: 'doctor' }).lean();
        finalStaffId = fallbackUser?._id;
      }
    }

    if (!finalStaffId || !finalStaffName) {
      return NextResponse.json(
        { success: false, error: 'Staff member selection is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const newRoster = await DutyRoster.create({
      staff: finalStaffId,
      staffName: finalStaffName,
      role: finalRole,
      department,
      shift,
      date,
      status,
      notes,
    });

    try {
      await AuditLog.create({
        action: 'CREATE',
        module: 'Schedules',
        description: `Scheduled shift for ${finalStaffName} (${shift}) in ${department} on ${date}`,
        user: 'Admin Administrator',
        userRole: 'admin',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Shift roster assigned for ${finalStaffName}`,
        roster: newRoster,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Duty-Rosters POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error creating duty roster' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
