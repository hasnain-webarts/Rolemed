import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Appointment from '@/models/Appointment';
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

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'patient']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const appointment = await Appointment.findOne({
      $or: [
        { appointmentId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      appointment,
    }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[API Appointment [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching appointment details' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const existing = await Appointment.findOne({
      $or: [
        { appointmentId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found to update' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const targetDate = body.date || existing.date;
    const targetDoctorName = body.doctorName || existing.doctorName;

    // If date or doctor is being updated, and appointment is not cancelled, validate availability
    if ((body.date || body.doctorName) && body.status !== 'Cancelled' && existing.status !== 'Cancelled') {
      const doctor = await User.findOne({
        $or: [
          { name: new RegExp(escapeRegex(targetDoctorName.replace(/^Dr\.\s*/i, '').trim()), 'i') },
          { name: new RegExp(escapeRegex(targetDoctorName.trim()), 'i') },
        ],
        role: 'doctor',
      }).lean();

      if (doctor) {
        // 1. Leave conflict check
        if (doctor.leaves && doctor.leaves.length > 0) {
          const leaveConflict = doctor.leaves.find((l) => {
            if (!l.startDate || !l.endDate) return false;
            const status = (l.status || '').toLowerCase();
            const isApproved = status === 'approved';
            return isApproved && targetDate >= l.startDate && targetDate <= l.endDate;
          });

          if (leaveConflict) {
            return NextResponse.json(
              {
                success: false,
                error: `Dr. ${doctor.name} is on scheduled leave from ${leaveConflict.startDate} to ${leaveConflict.endDate} (${leaveConflict.reason}). Reschedule rejected.`,
              },
              { status: 400, headers: NO_CACHE_HEADERS }
            );
          }
        }

        // 2. Weekly schedule off-duty check
        if (doctor.weeklySchedule && doctor.weeklySchedule.length > 0) {
          const dateObj = new Date(`${targetDate}T12:00:00Z`);
          const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
          const daySlot = doctor.weeklySchedule.find(
            (s) => s.day && s.day.toLowerCase() === dayOfWeek.toLowerCase()
          );

          if (daySlot && daySlot.active === false) {
            const activeDays = doctor.weeklySchedule
              .filter((s) => s.active)
              .map((s) => s.day)
              .join(', ');
            return NextResponse.json(
              {
                success: false,
                error: `Dr. ${doctor.name} is off-duty on ${dayOfWeek}s. Available consulting days: ${activeDays || 'None'}.`,
              },
              { status: 400, headers: NO_CACHE_HEADERS }
            );
          }
        }
      }
    }

    // Strict allowlist update (prevent mass assignment of appointmentId, patientId, etc.)
    const allowedFields = [
      'doctorName',
      'date',
      'time',
      'reason',
      'type',
      'status',
      'queueNumber',
      'priority',
      'notes',
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        existing[field] = body[field];
      }
    }
    await existing.save();

    try {
      await AuditLog.create({
        action: 'UPDATE',
        module: 'Appointments',
        description: `Updated appointment ${existing.appointmentId} (${body.status ? `status: ${body.status}` : ''}${body.date ? ` date: ${body.date}` : ''})`,
        user: 'Desk / Staff',
        userRole: 'staff',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Could not record appointment update audit log:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Appointment ${existing.appointmentId} updated successfully`,
      appointment: existing,
    }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[API Appointment [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update appointment' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const appointment = await Appointment.findOneAndUpdate(
      {
        $or: [
          { appointmentId: id.toUpperCase() },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        ],
      },
      { $set: { status: 'Cancelled' } },
      { new: true }
    );

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    try {
      await AuditLog.create({
        action: 'CANCEL',
        module: 'Appointments',
        description: `Cancelled appointment ${appointment.appointmentId} for ${appointment.patientName}`,
        user: 'Desk / Staff',
        userRole: 'staff',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Could not record appointment cancellation audit log:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Appointment ${appointment.appointmentId} cancelled successfully`,
      appointment,
    }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[API Appointment [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel appointment' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
