import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Consultation from '@/models/Consultation';
import Patient from '@/models/Patient';
import Appointment from '@/models/Appointment';
import LabOrder from '@/models/LabOrder';
import { escapeRegex } from '@/lib/escapeRegex';

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'patient']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const patientId = searchParams.get('patientId') || '';
    const doctor = searchParams.get('doctor') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query = {};

    // Patient scoping
    if (user.role === 'patient') {
      query.patientId = user.patientId || 'NONE';
    }

    if (patientId) {
      query.patientId = patientId.toUpperCase();
    }

    if (doctor && doctor.trim()) {
      query.doctorName = { $regex: escapeRegex(doctor.trim()), $options: 'i' };
    }

    if (search && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { patientName: { $regex: safeSearch, $options: 'i' } },
        { diagnosis: { $regex: safeSearch, $options: 'i' } },
        { consultationId: { $regex: safeSearch, $options: 'i' } },
        { notes: { $regex: safeSearch, $options: 'i' } },
        { symptoms: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const consultations = await Consultation.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      count: consultations.length,
      consultations,
    });
  } catch (error) {
    console.error('[API Consultations GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching consultations' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();

    const {
      patientId,
      symptoms,
      bp,
      temp,
      pulse,
      respRate,
      spO2,
      weight,
      diagnosis,
      labs = [],
      notes,
      appointmentId,
      doctorName = 'Dr. Sarah Johnson',
    } = body;

    if (!patientId || !diagnosis || !notes) {
      return NextResponse.json(
        { success: false, error: 'Patient ID, Diagnosis, and Clinical Notes are required fields' },
        { status: 400 }
      );
    }

    // Resolve patient
    const patient = await Patient.findOne({
      $or: [
        { patientId: patientId.toUpperCase() },
        { _id: patientId.match(/^[0-9a-fA-F]{24}$/) ? patientId : null },
      ],
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: `Patient ${patientId} not found in registry` },
        { status: 404 }
      );
    }

    const consultationId = await Consultation.generateNextConsultationId();

    const vitals = {
      bp: bp || '120/80',
      temp: temp ? (temp.includes('°') ? temp : `${temp}°F`) : '98.6°F',
      pulse: pulse ? (pulse.includes('bpm') ? pulse : `${pulse} bpm`) : '72 bpm',
      respRate: respRate || '16 /min',
      spO2: spO2 || '98%',
      weight: weight ? (weight.includes('kg') ? weight : `${weight} kg`) : '70 kg',
    };

    const newConsultation = await Consultation.create({
      consultationId,
      patient: patient._id,
      patientId: patient.patientId,
      patientName: patient.name,
      doctorName,
      appointmentId: appointmentId || '',
      symptoms: symptoms || 'Routine follow-up & clinical evaluation',
      vitals,
      diagnosis,
      labs: Array.isArray(labs) ? labs : [],
      notes,
      date: new Date().toISOString().split('T')[0],
    });

    // 1. Advance linked appointment status to Completed if provided
    if (appointmentId) {
      await Appointment.findOneAndUpdate(
        { appointmentId },
        { $set: { status: 'Completed' } }
      );
    }

    // 2. Automatically dispatch Lab Orders for requested diagnostic investigations
    const createdLabOrders = [];
    if (Array.isArray(labs) && labs.length > 0) {
      for (const testName of labs) {
        if (!testName) continue;
        const orderId = await LabOrder.generateNextOrderId();
        const isUrgent = diagnosis.toLowerCase().includes('emergency') || diagnosis.toLowerCase().includes('chest');
        const labOrder = await LabOrder.create({
          orderId,
          patient: patient._id,
          patientId: patient.patientId,
          patientName: patient.name,
          doctorName,
          consultationId,
          testName,
          priority: isUrgent ? 'Urgent' : 'Routine',
          status: 'Pending',
          date: new Date().toISOString().split('T')[0],
        });
        createdLabOrders.push(labOrder);
      }
    }

    // 3. Append vitals to patient's vitalsHistory
    if (bp || temp || pulse) {
      patient.vitalsHistory.unshift({
        date: new Date().toISOString().split('T')[0],
        bp: vitals.bp,
        temp: vitals.temp,
        pulse: vitals.pulse,
        weight: vitals.weight,
        recordedBy: doctorName,
      });
      await patient.save();
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Consultation note recorded successfully',
        consultation: newConsultation,
        dispatchedLabsCount: createdLabOrders.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Consultations POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error recording consultation' },
      { status: 500 }
    );
  }
}
