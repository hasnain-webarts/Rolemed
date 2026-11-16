import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import { parsePaginationParams, buildPaginationMeta } from '@/lib/pagination';
import Appointment from '@/models/Appointment';
import Patient from '@/models/Patient';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { dispatchNotification } from '@/lib/notificationService';

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
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'patient']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const tab = searchParams.get('tab'); // 'today' | 'upcoming' | 'past'
    const status = searchParams.get('status');
    const doctor = searchParams.get('doctor');
    const patientId = searchParams.get('patientId');
    const search = searchParams.get('search');
    const { page, limit, skip } = parsePaginationParams(searchParams, 100, 200);

    const query = {};

    // Scoping for patient role
    if (user.role === 'patient') {
      query.patientId = user.patientId || 'NONE';
    }

    // Today's date reference in YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    if (date) {
      query.date = date;
    } else if (tab === 'today') {
      query.date = todayStr;
    } else if (tab === 'upcoming') {
      query.date = { $gt: todayStr };
    } else if (tab === 'past') {
      query.date = { $lt: todayStr };
    }

    if (status) {
      query.status = status;
    }

    if (doctor && doctor.trim()) {
      query.doctorName = new RegExp(escapeRegex(doctor.trim()), 'i');
    }

    if (patientId) {
      query.patientId = patientId.toUpperCase();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { patientName: searchRegex },
        { appointmentId: searchRegex },
        { patientId: searchRegex },
        { reason: searchRegex },
        { doctorName: searchRegex },
      ];
    }

    const [totalCount, appointments] = await Promise.all([
      Appointment.countDocuments(query),
      Appointment.find(query)
        .sort({ date: tab === 'past' ? -1 : 1, time: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      count: appointments.length,
      appointments,
      pagination: buildPaginationMeta(totalCount, page, limit),
    });
  } catch (error) {
    console.error('[API Appointments GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve appointments' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'receptionist', 'doctor', 'patient']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();
    let {
      appointmentId,
      patientId,
      patientName,
      doctorName,
      date,
      time,
      reason,
      type,
      priority,
      notes,
    } = body;

    if (!patientId || !doctorName || !date) {
      return NextResponse.json(
        { success: false, error: 'Patient ID, Doctor Name, and Date are required' },
        { status: 400 }
      );
    }

    // Verify doctor availability against MongoDB leaves and weekly consulting schedule
    const doctor = await User.findOne({
      $or: [
        { name: new RegExp(escapeRegex(doctorName.replace(/^Dr\.\s*/i, '').trim()), 'i') },
        { name: new RegExp(escapeRegex(doctorName.trim()), 'i') },
      ],
      role: 'doctor',
    }).lean();

    if (doctor) {
      // 1. Check leave conflict (only Approved leaves block appointment booking)
      if (doctor.leaves && doctor.leaves.length > 0) {
        const leaveConflict = doctor.leaves.find((l) => {
          if (!l.startDate || !l.endDate) return false;
          const status = (l.status || '').toLowerCase();
          const isApproved = status === 'approved';
          return isApproved && date >= l.startDate && date <= l.endDate;
        });

        if (leaveConflict) {
          return NextResponse.json(
            {
              success: false,
              error: `Dr. ${doctor.name} is on scheduled leave from ${leaveConflict.startDate} to ${leaveConflict.endDate} (${leaveConflict.reason}). Please select another date or practitioner.`,
            },
            { status: 400, headers: NO_CACHE_HEADERS }
          );
        }
      }

      // 2. Check weekly consulting schedule
      if (doctor.weeklySchedule && doctor.weeklySchedule.length > 0) {
        const dateObj = new Date(`${date}T12:00:00Z`);
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

    // Lookup patient to verify existence and get accurate name
    const patient = await Patient.findOne({ patientId: patientId.toUpperCase() });
    if (patient && !patientName) {
      patientName = patient.name;
    }

    const assignedId = appointmentId || (await Appointment.generateNextAppointmentId());

    // Calculate queue number for that doctor on that date
    const countForDay = await Appointment.countDocuments({
      date,
      doctorName,
      status: { $ne: 'Cancelled' },
    });
    const queueNumber = countForDay + 1;
    const finalTime = time && time.trim() ? time.trim() : `Token #${String(queueNumber).padStart(2, '0')}`;

    const appointment = await Appointment.create({
      appointmentId: assignedId,
      patient: patient ? patient._id : undefined,
      patientId: patientId.toUpperCase(),
      patientName: patientName || 'Patient',
      doctorName,
      date,
      time: finalTime,
      reason: reason || 'General Consultation',
      type: type || 'Checkup',
      status: 'Scheduled',
      queueNumber,
      priority: priority || 'Normal',
      notes: notes || '',
    });

    try {
      await AuditLog.create({
        action: 'CREATE',
        module: 'Appointments',
        description: `Booked appointment ${appointment.appointmentId} for ${appointment.patientName} with ${doctorName} on ${date}`,
        user: 'Reception Desk',
        userRole: 'receptionist',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Could not record appointment booking audit log:', auditErr.message);
    }

    // Dispatch Appointment Confirmation Notification (Email + WhatsApp + In-App)
    dispatchNotification({
      recipientId: appointment.patientId,
      recipientRole: 'patient',
      recipientName: appointment.patientName,
      recipientEmail: patient?.email || '',
      recipientPhone: patient?.phone || '',
      type: 'APPOINTMENT_CONFIRMATION',
      data: {
        appointmentId: appointment.appointmentId,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        doctorName: appointment.doctorName,
        date: appointment.date,
        time: appointment.time,
        reason: appointment.reason,
      },
      channels: ['email', 'whatsapp', 'in_app'],
      metadata: { appointmentId: appointment.appointmentId, date: appointment.date, time: appointment.time },
    }).catch((err) => console.warn('[Appointment Booking Notification Warning]:', err.message));

    return NextResponse.json(
      {
        success: true,
        message: `Appointment ${appointment.appointmentId} booked successfully for ${appointment.patientName}`,
        appointment,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Appointments POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to book appointment' },
      { status: 500 }
    );
  }
}
