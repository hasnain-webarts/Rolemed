import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Appointment from '@/models/Appointment';

const DOCTOR_ROOMS = {
  'Dr. Ayesha Siddiqui': { specialty: 'Cardiology', room: 'Chamber 302' },
  'Dr. Asim Raza': { specialty: 'Neurology', room: 'Chamber 304' },
  'Dr. Tariq Mahmood': { specialty: 'Clinical Operations', room: 'Suite 501' },
  'Dr. Sarah Johnson': { specialty: 'Cardiology', room: 'Room 301' },
  'Dr. Robert Chen': { specialty: 'Neurology', room: 'Room 304' },
  'Dr. Elena Rodriguez': { specialty: 'General Surgery', room: 'Room 305' },
  'Dr. Arthur Vance': { specialty: 'Clinical Operations', room: 'Room 101' },
  'Dr. Michael Chen': { specialty: 'Lead Pharmacist', room: 'Room 102' },
};

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const doctorParam = searchParams.get('doctor') || '';
    const todayStr = new Date().toISOString().split('T')[0];

    const aptQuery = {
      date: todayStr,
      status: { $in: ['Scheduled', 'Checked In', 'In Progress', 'Completed'] },
    };

    if (doctorParam && doctorParam.trim() && doctorParam !== 'All') {
      aptQuery.doctorName = new RegExp(doctorParam.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    // Find today's active appointments
    const appointments = await Appointment.find(aptQuery)
      .sort({ queueNumber: 1, time: 1 })
      .lean();

    // Map appointments to queue display items
    const queue = appointments.map((apt) => {
      let queueStatus = 'Waiting';
      if (apt.status === 'In Progress') queueStatus = 'With Doctor';
      else if (apt.status === 'Checked In') queueStatus = 'Calling';
      else if (apt.status === 'Completed') queueStatus = 'Completed';

      const docInfo = DOCTOR_ROOMS[apt.doctorName] || { room: 'Room 301', specialty: 'General' };

      return {
        id: `Q-${String(apt.queueNumber || 1).padStart(2, '0')}`,
        appointmentId: apt.appointmentId,
        patientId: apt.patientId,
        patientName: apt.patientName,
        doctor: apt.doctorName,
        room: docInfo.room,
        time: apt.time,
        status: queueStatus,
      };
    });

    // Compute doctor active workload
    const doctorsMap = {};
    Object.entries(DOCTOR_ROOMS).forEach(([name, info]) => {
      doctorsMap[name] = {
        name,
        specialty: info.specialty,
        room: info.room,
        status: 'Available',
        patientsInQueue: 0,
      };
    });

    queue.forEach((q) => {
      if (doctorsMap[q.doctor] && q.status !== 'Completed') {
        doctorsMap[q.doctor].patientsInQueue += 1;
        if (q.status === 'With Doctor') {
          doctorsMap[q.doctor].status = 'In Consultation';
        }
      }
    });

    return NextResponse.json({
      success: true,
      count: queue.length,
      queue,
      doctors: Object.values(doctorsMap),
    });
  } catch (error) {
    console.error('[API Queue GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch queue status' },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();
    const { appointmentId, status, newDoctor } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Map queue status to appointment status
    let aptStatus = 'Scheduled';
    if (status === 'With Doctor') aptStatus = 'In Progress';
    else if (status === 'Calling' || status === 'Waiting') aptStatus = 'Checked In';
    else if (status === 'Completed') aptStatus = 'Completed';
    else if (status) aptStatus = status;

    const updateFields = { status: aptStatus };
    if (newDoctor) updateFields.doctorName = newDoctor;

    const appointment = await Appointment.findOneAndUpdate(
      {
        $or: [
          { appointmentId: appointmentId.toUpperCase() },
          { _id: appointmentId.match(/^[0-9a-fA-F]{24}$/) ? appointmentId : null },
        ],
      },
      { $set: updateFields },
      { new: true }
    );

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Queue appointment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Queue status for ${appointment.patientName} updated to ${status || aptStatus}`,
      appointment,
    });
  } catch (error) {
    console.error('[API Queue PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update queue item' },
      { status: 500 }
    );
  }
}
