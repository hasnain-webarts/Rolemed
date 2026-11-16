import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const DEFAULT_SCHEDULE = [
  { day: 'Monday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '30 mins' },
  { day: 'Tuesday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '30 mins' },
  { day: 'Wednesday', active: true, start: '09:00 AM', end: '01:00 PM', slotDuration: '30 mins' },
  { day: 'Thursday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '30 mins' },
  { day: 'Friday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '30 mins' },
  { day: 'Saturday', active: false, start: '10:00 AM', end: '02:00 PM', slotDuration: '45 mins' },
  { day: 'Sunday', active: false, start: '10:00 AM', end: '02:00 PM', slotDuration: '30 mins' },
];

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const requestedEmail = searchParams.get('email');
    const requestedDoctorId = searchParams.get('doctorId');

    let doctor = null;

    if (requestedDoctorId && requestedDoctorId.match(/^[0-9a-fA-F]{24}$/)) {
      doctor = await User.findById(requestedDoctorId);
    } else if (requestedEmail) {
      doctor = await User.findOne({ email: requestedEmail.toLowerCase() });
    } else if (auth.user?.id) {
      doctor = await User.findById(auth.user.id);
    } else if (auth.user?.email) {
      doctor = await User.findOne({ email: auth.user.email.toLowerCase() });
    }

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Physician profile not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const weeklySchedule = doctor.weeklySchedule && doctor.weeklySchedule.length > 0
      ? doctor.weeklySchedule
      : DEFAULT_SCHEDULE;

    return NextResponse.json(
      {
        success: true,
        doctorId: doctor._id.toString(),
        doctorName: doctor.name,
        department: doctor.department,
        weeklySchedule,
        leaves: doctor.leaves || [],
        isOnCall: doctor.isOnCall !== false,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Doctor Schedule GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching doctor schedule' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PUT(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const body = await req.json();

    const { email, doctorId, weeklySchedule, leaves, isOnCall } = body;

    let doctor = null;
    // Admins can manage any doctor's schedule; doctors can manage their own
    if (user.role === 'admin') {
      if (doctorId && doctorId.match(/^[0-9a-fA-F]{24}$/)) {
        doctor = await User.findById(doctorId);
      } else if (email) {
        doctor = await User.findOne({ email: email.toLowerCase() });
      } else {
        doctor = await User.findById(user.id);
      }
    } else {
      doctor = await User.findById(user.id);
    }

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Physician account not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (weeklySchedule !== undefined) {
      doctor.weeklySchedule = weeklySchedule;
    }

    if (leaves !== undefined) {
      doctor.leaves = leaves;
    }

    if (isOnCall !== undefined) {
      doctor.isOnCall = Boolean(isOnCall);
    }

    await doctor.save();

    // Log event in AuditLog
    try {
      await AuditLog.create({
        action: 'UPDATE',
        module: 'Schedules',
        description: `Updated clinical schedule and leave availability for Dr. ${doctor.name}`,
        user: doctor.name,
        userRole: doctor.role || 'doctor',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Could not record schedule update audit log:', auditErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Doctor schedule and availability updated successfully',
        weeklySchedule: doctor.weeklySchedule,
        leaves: doctor.leaves,
        isOnCall: doctor.isOnCall,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Doctor Schedule PUT Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating doctor schedule' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

