import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import Appointment from '@/models/Appointment';
import Patient from '@/models/Patient';
import { escapeRegex } from '@/lib/escapeRegex';
import { dispatchNotification } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || '';

    // Find all doctors who have leaves recorded
    const doctors = await User.find({
      role: 'doctor',
      'leaves.0': { $exists: true },
    })
      .select('name email phone department specialization leaves')
      .lean();

    const flattenedLeaves = [];
    doctors.forEach((doc) => {
      (doc.leaves || []).forEach((l) => {
        if (!statusFilter || l.status?.toLowerCase() === statusFilter.toLowerCase()) {
          flattenedLeaves.push({
            id: l.id,
            doctorId: doc._id,
            doctorName: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
            doctorEmail: doc.email,
            doctorPhone: doc.phone || 'N/A',
            department: doc.department || 'Clinical Medicine',
            specialization: doc.specialization || 'Physician',
            startDate: l.startDate,
            endDate: l.endDate,
            reason: l.reason,
            status: l.status || 'Pending Approval',
          });
        }
      });
    });

    // Sort: Pending Approval first, then by startDate descending
    flattenedLeaves.sort((a, b) => {
      if (a.status === 'Pending Approval' && b.status !== 'Pending Approval') return -1;
      if (b.status === 'Pending Approval' && a.status !== 'Pending Approval') return 1;
      return (b.startDate || '').localeCompare(a.startDate || '');
    });

    return NextResponse.json({
      success: true,
      count: flattenedLeaves.length,
      leaves: flattenedLeaves,
    });
  } catch (error) {
    console.error('[API Admin Leaves GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch doctor leave requests' },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();
    const { doctorId, leaveId, status, reviewNote } = body;

    if (!doctorId || !leaveId || !status) {
      return NextResponse.json(
        { success: false, error: 'Doctor ID, Leave ID, and new status are required' },
        { status: 400 }
      );
    }

    if (!['Approved', 'Rejected', 'Pending Approval'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be Approved, Rejected, or Pending Approval' },
        { status: 400 }
      );
    }

    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor record not found' },
        { status: 404 }
      );
    }

    const leaveIndex = (doctor.leaves || []).findIndex((l) => l.id === leaveId);
    if (leaveIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found on doctor record' },
        { status: 404 }
      );
    }

    const targetLeave = doctor.leaves[leaveIndex];

    // Update leave status and note
    targetLeave.status = status;
    if (reviewNote) {
      targetLeave.reviewNote = reviewNote;
    }
    doctor.markModified('leaves');
    await doctor.save();

    // Conflict detection: if leave is Approved, check for pre-existing scheduled appointments
    let conflictCount = 0;
    let conflicts = [];

    if (status === 'Approved' && targetLeave.startDate && targetLeave.endDate) {
      const cleanDocName = (doctor.name || '').replace(/^Dr\.?\s+/i, '').trim();
      const docRegex = new RegExp(`^(Dr\\.?\\s+)?${escapeRegex(cleanDocName)}$`, 'i');

      const overlappingAppointments = await Appointment.find({
        doctorName: docRegex,
        date: { $gte: targetLeave.startDate, $lte: targetLeave.endDate },
        status: { $in: ['Scheduled', 'Checked In'] },
      }).select('appointmentId patientName date time reason status').lean();

      if (overlappingAppointments.length > 0) {
        conflictCount = overlappingAppointments.length;
        conflicts = overlappingAppointments;
        const conflictIds = overlappingAppointments.map((a) => a.appointmentId);

        await Appointment.updateMany(
          { _id: { $in: overlappingAppointments.map((a) => a._id) } },
          {
            $set: {
              status: 'Reschedule Required',
              notes: `Flagged for rescheduling due to approved leave (${targetLeave.startDate} to ${targetLeave.endDate}).`,
            },
          }
        );

        try {
          await AuditLog.create({
            action: 'UPDATE',
            module: 'Appointments',
            description: `Leave approval for ${doctor.name} (${targetLeave.startDate} to ${targetLeave.endDate}) flagged ${conflictCount} appointment(s) as Reschedule Required: ${conflictIds.join(', ')}`,
            user: auth.user?.name || 'Administrator',
            userRole: 'admin',
            ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          });
        } catch (auditErr) {
          console.warn('Failed to write conflict audit log:', auditErr);
        }
      }
    }

    // Log to Audit Trail
    try {
      await AuditLog.create({
        action: 'UPDATE',
        module: 'Schedules',
        description: `Leave request ${leaveId} for ${doctor.name} updated to "${status}"${reviewNote ? ` (Note: ${reviewNote})` : ''}${conflictCount > 0 ? ` [${conflictCount} conflicting appointment(s) flagged for reschedule]` : ''}`,
        user: auth.user?.name || 'Administrator',
        userRole: 'admin',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    } catch (auditErr) {
      console.warn('Failed to write leave review audit log:', auditErr);
    }

    // Dispatch Leave Status Notification to Doctor (Email + WhatsApp + In-App)
    dispatchNotification({
      recipientId: String(doctor.employeeId || doctor._id),
      recipientRole: 'doctor',
      recipientName: doctor.name,
      recipientEmail: doctor.email,
      recipientPhone: doctor.phone,
      type: 'LEAVE_STATUS_UPDATE',
      data: {
        leaveId,
        doctorName: doctor.name,
        startDate: targetLeave.startDate,
        endDate: targetLeave.endDate,
        reason: targetLeave.reason,
        status,
        reviewNote,
        conflictCount,
      },
      channels: ['email', 'whatsapp', 'in_app'],
      metadata: { leaveId, doctorId: String(doctor._id), status },
    }).catch((err) => console.warn('[Leave Status Notification Warning]:', err.message));

    // If appointments required rescheduling, notify affected patients
    if (conflicts && conflicts.length > 0) {
      (async () => {
        for (const apt of conflicts) {
          try {
            const pat = await Patient.findOne({ patientId: apt.patientId }).select('email phone').lean();
            await dispatchNotification({
              recipientId: apt.patientId,
              recipientRole: 'patient',
              recipientName: apt.patientName,
              recipientEmail: pat?.email || '',
              recipientPhone: pat?.phone || '',
              type: 'APPOINTMENT_RESCHEDULED',
              data: {
                appointmentId: apt.appointmentId,
                patientName: apt.patientName,
                doctorName: doctor.name,
                date: apt.date,
              },
              channels: ['email', 'whatsapp', 'in_app'],
              metadata: { appointmentId: apt.appointmentId },
            });
          } catch (err) {
            console.warn('[Conflict Patient Notification Warning]:', err.message);
          }
        }
      })();
    }

    return NextResponse.json({
      success: true,
      message: `Doctor leave request successfully marked as "${status}"${conflictCount > 0 ? `. Warning: ${conflictCount} overlapping appointment(s) flagged as Reschedule Required.` : ''}`,
      leave: targetLeave,
      conflictCount,
      conflicts,
    });
  } catch (error) {
    return handleApiError(error, 'Admin Leaves PATCH');
  }
}

