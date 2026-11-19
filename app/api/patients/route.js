import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import { parsePaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { normalizePhoneForStorage, buildPhoneSearchRegex } from '@/lib/phoneUtils';
import Patient from '@/models/Patient';
import Appointment from '@/models/Appointment';
import Consultation from '@/models/Consultation';
import Admission from '@/models/Admission';
import { dispatchNotification } from '@/lib/notificationService';
import escapeRegex from '@/lib/escapeRegex';

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician', 'patient']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const doctor = searchParams.get('doctor') || '';
    const { page, limit, skip } = parsePaginationParams(searchParams, 100, 200);

    const query = {};

    // Patient role scoping (patients can only see their own records)
    if (user.role === 'patient') {
      query.patientId = user.patientId || 'NONE';
    }

    if (status) {
      query.status = status;
    }

    if (doctor && doctor.trim() && doctor !== 'All') {
      const docRegex = new RegExp(escapeRegex(doctor.trim()), 'i');
      const [aptPatIds, conPatIds, admPatIds] = await Promise.all([
        Appointment.distinct('patientId', { doctorName: docRegex }),
        Consultation.distinct('patientId', { doctorName: docRegex }),
        Admission.distinct('patientId', { doctorName: docRegex }),
      ]);
      const matchedPatientIds = Array.from(new Set([...aptPatIds, ...conPatIds, ...admPatIds]));
      query.patientId = { $in: matchedPatientIds };
    }

    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      const searchRegex = new RegExp(escaped, 'i');
      const cleanDigits = search.replace(/\D/g, '');
      const orConditions = [
        { name: searchRegex },
        { patientId: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { cnic: searchRegex },
        { address: searchRegex },
      ];

      // Smart Pakistani Phone Number Search (Matches on both 03xxxxx and 3xxxxx, with or without dashes/spaces)
      const phoneRegex = buildPhoneSearchRegex(search.trim());
      if (phoneRegex) {
        orConditions.push({ phone: phoneRegex });
        orConditions.push({ 'emergencyContact.phone': phoneRegex });
      }

      // If user typed digits, allow matching formatted CNIC
      if (cleanDigits.length >= 4) {
        const flexibleCnic = cleanDigits.split('').join('[-. ]?');
        orConditions.push({ cnic: new RegExp(flexibleCnic, 'i') });
      }

      query.$or = orConditions;
    }

    const [totalCount, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      count: patients.length,
      patients,
      pagination: buildPaginationMeta(totalCount, page, limit),
    });
  } catch (error) {
    console.error('[API Patients GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve patient registry' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'receptionist', 'doctor']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();
    const {
      patientId,
      name,
      age,
      gender,
      phone,
      cnic,
      email,
      bloodGroup,
      address,
      emergencyContact,
      emergencyPhone,
      emergencyRelation,
      allergies,
      medicalHistory,
      status,
      assignedBed,
    } = body;

    if (!name || age === undefined || !gender || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name, age, gender, and phone number are required' },
        { status: 400 }
      );
    }

    // Auto-generate ID if not provided
    const assignedId = patientId || (await Patient.generateNextPatientId());

    // Format allergies array
    let formattedAllergies = [];
    if (Array.isArray(allergies)) {
      formattedAllergies = allergies.map(a => String(a).trim()).filter(Boolean);
    } else if (typeof allergies === 'string' && allergies.trim()) {
      formattedAllergies = allergies
        .split(',')
        .map(a => a.trim())
        .filter(a => a && a.toLowerCase() !== 'none' && a.toLowerCase() !== 'n/a');
    }

    const patient = await Patient.create({
      patientId: assignedId,
      name: name.trim(),
      age: parseInt(age, 10),
      gender,
      phone: normalizePhoneForStorage(phone),
      cnic: cnic ? String(cnic).trim() : '',
      email: email ? email.trim().toLowerCase() : '',
      bloodGroup: bloodGroup || 'Unknown',
      address: address ? address.trim() : '',
      emergencyContact: {
        name: emergencyContact || '',
        phone: normalizePhoneForStorage(emergencyPhone),
        relation: emergencyRelation || 'Family',
      },
      allergies: formattedAllergies,
      medicalHistory: Array.isArray(medicalHistory) ? medicalHistory : [],
      status: status || 'Outpatient',
      assignedBed: assignedBed || '',
    });

    // Dispatch Patient Registration Welcome Notification (Email + WhatsApp + In-App)
    dispatchNotification({
      recipientId: patient.patientId,
      recipientRole: 'patient',
      recipientName: patient.name,
      recipientEmail: patient.email || '',
      recipientPhone: patient.phone || '',
      type: 'PATIENT_REGISTRATION',
      data: {
        patientId: patient.patientId,
        name: patient.name,
        phone: patient.phone,
        cnic: patient.cnic,
        bloodGroup: patient.bloodGroup,
      },
      channels: ['email', 'whatsapp', 'in_app'],
      metadata: { patientId: patient.patientId },
    }).catch((err) => console.warn('[Patient Registration Notification Warning]:', err.message));

    return NextResponse.json(
      {
        success: true,
        message: `Patient ${patient.name} registered successfully with ID ${patient.patientId}`,
        patient,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Patients POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register patient profile' },
      { status: 500 }
    );
  }
}
