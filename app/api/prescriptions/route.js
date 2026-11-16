import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Prescription from '@/models/Prescription';
import Patient from '@/models/Patient';
import { escapeRegex } from '@/lib/escapeRegex';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'pharmacist', 'patient']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || '';
    const status = searchParams.get('status') || '';
    const doctor = searchParams.get('doctor') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query = {};

    // Patient scoping
    if (user.role === 'patient') {
      query.patientId = user.patientId || 'NONE';
    }

    if (patientId) {
      query.patientId = patientId.toUpperCase();
    }

    if (status) {
      query.status = status;
    }

    if (doctor && doctor.trim()) {
      query.doctorName = { $regex: escapeRegex(doctor.trim()), $options: 'i' };
    }

    if (search && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { patientName: { $regex: safeSearch, $options: 'i' } },
        { prescriptionId: { $regex: safeSearch, $options: 'i' } },
        { patientId: { $regex: safeSearch, $options: 'i' } },
        { 'drugs.name': { $regex: safeSearch, $options: 'i' } },
        { generalInstructions: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: prescriptions.length,
        prescriptions,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Prescriptions GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching prescriptions' },
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
      consultationId,
      drugs = [],
      generalInstructions,
      doctorName = 'Dr. Sarah Johnson',
    } = body;

    if (!patientId || !Array.isArray(drugs) || drugs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Patient ID and at least one medication item are required' },
        { status: 400 }
      );
    }

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

    const prescriptionId = (body.prescriptionId && String(body.prescriptionId).trim())
      ? String(body.prescriptionId).trim().toUpperCase()
      : await Prescription.generateNextPrescriptionId();

    const formattedDrugs = drugs.map((d) => ({
      name: d.name || 'Medication',
      dosage: d.dosage || 'Standard dose',
      frequency: d.frequency || 'Once daily',
      duration: d.duration || '5 days',
      instruction: d.instruction || 'After meals',
      qtyNeeded: Number(d.qtyNeeded) || 10,
      quantityPerPack: Number(d.quantityPerPack) || 10,
      pricePerPack: Number(d.pricePerPack) || 0,
      unitPrice: Number(d.unitPrice) || 0,
      totalPrice: Number(d.totalPrice) || 0,
      isCustomerAddOn: !!d.isCustomerAddOn,
    }));

    const computedTotal = formattedDrugs.reduce((sum, d) => sum + (d.totalPrice || 0), 0);

    const newPrescription = await Prescription.create({
      prescriptionId,
      patient: patient._id,
      patientId: patient.patientId,
      patientName: patient.name,
      doctorName,
      consultationId: consultationId || '',
      drugs: formattedDrugs,
      generalInstructions: generalInstructions || 'Take medications as directed. Finish full course.',
      status: body.status || 'Pending Dispensation',
      totalAmount: Number(body.totalAmount) || computedTotal,
      paymentStatus: body.paymentStatus || 'Unpaid',
      paymentMethod: body.paymentMethod || 'Cash',
      date: new Date().toISOString().split('T')[0],
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Prescription recorded and dispatched to pharmacy',
        prescription: newPrescription,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Prescriptions POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error creating prescription' },
      { status: 500 }
    );
  }
}
