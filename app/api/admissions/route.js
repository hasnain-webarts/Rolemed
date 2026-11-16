import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Admission from '@/models/Admission';
import Patient from '@/models/Patient';
import Equipment from '@/models/Equipment';
import { escapeRegex } from '@/lib/escapeRegex';
import { dispatchNotification } from '@/lib/notificationService';

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const ward = searchParams.get('ward');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const query = {};

    if (status) {
      query.status = status;
    }

    if (ward) {
      query.ward = ward;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { patientName: searchRegex },
        { admissionId: searchRegex },
        { patientId: searchRegex },
        { bedNumber: searchRegex },
        { doctorName: searchRegex },
        { admittingDiagnosis: searchRegex },
      ];
    }

    const admissions = await Admission.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Also compute ward bed statistics and load live hospital bed fleet
    const [activeAdmissions, hospitalBeds] = await Promise.all([
      Admission.find({ status: 'Admitted' }).select('ward bedNumber patientName patientId admissionDate').lean(),
      Equipment.find({ category: 'Hospital Bed', isArchived: false })
        .select('assetId name department locationRoom bedNumber status condition maintenanceHistory')
        .lean(),
    ]);
    const occupiedBedsCount = activeAdmissions.length;

    return NextResponse.json({
      success: true,
      count: admissions.length,
      occupiedBedsCount,
      admissions,
      beds: hospitalBeds,
    });
  } catch (error) {
    console.error('[API Admissions GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve admission records' },
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
    let {
      admissionId,
      patientId,
      patientName,
      ward,
      bedNumber,
      doctorName,
      admittingDiagnosis,
      notes,
    } = body;

    if (!patientId || !ward || !bedNumber || !doctorName) {
      return NextResponse.json(
        { success: false, error: 'Patient ID, Ward, Bed Number, and Doctor Name are required' },
        { status: 400 }
      );
    }

    const normalizedBed = bedNumber.trim().toUpperCase();

    // Check if bed is already occupied by an active inpatient
    const bedTaken = await Admission.findOne({
      ward,
      bedNumber: normalizedBed,
      status: 'Admitted',
    });

    if (bedTaken) {
      return NextResponse.json(
        {
          success: false,
          error: `Bed ${normalizedBed} in ${ward} is currently occupied by ${bedTaken.patientName}. Please select another bed.`,
        },
        { status: 409 }
      );
    }

    // Biomedical Maintenance & Operational Status Check from Equipment Fleet
    const bedAsset = await Equipment.findOne({
      category: 'Hospital Bed',
      bedNumber: normalizedBed,
      isArchived: false,
    });

    if (bedAsset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(bedAsset.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Bed ${normalizedBed} in ${ward} is currently marked as "${bedAsset.status}" (${bedAsset.condition}) for biomedical servicing. Please select an operational bed.`,
        },
        { status: 409 }
      );
    }

    // Lookup patient
    const patient = await Patient.findOne({ patientId: patientId.toUpperCase() });
    if (patient && !patientName) {
      patientName = patient.name;
    }

    const assignedId = admissionId || (await Admission.generateNextAdmissionId());

    const admission = await Admission.create({
      admissionId: assignedId,
      patient: patient ? patient._id : undefined,
      patientId: patientId.toUpperCase(),
      patientName: patientName || 'Patient',
      ward,
      bedNumber: bedNumber.trim().toUpperCase(),
      doctorName,
      admittingDiagnosis: admittingDiagnosis || 'Clinical Inpatient Triage',
      admissionDate: new Date(),
      status: 'Admitted',
      notes: notes || '',
    });

    // Update patient record
    if (patient) {
      patient.status = 'Inpatient';
      patient.assignedBed = `${ward} (${normalizedBed})`;
      await patient.save();
    }

    // Synchronize Bed Asset Fleet status in Equipment collection
    try {
      if (bedAsset) {
        bedAsset.status = 'In Use';
        bedAsset.notes = `Occupied by ${admission.patientName} (${admission.patientId}) via Admission ${admission.admissionId}`;
        await bedAsset.save();
      } else {
        await Equipment.findOneAndUpdate(
          { category: 'Hospital Bed', bedNumber: normalizedBed },
          {
            $set: {
              status: 'In Use',
              notes: `Occupied by ${admission.patientName} (${admission.patientId}) via Admission ${admission.admissionId}`,
            },
          }
        );
      }
    } catch (eqErr) {
      console.warn('[Admissions POST] Warning updating equipment bed status:', eqErr.message);
    }

    // Dispatch Inpatient Ward Admission Notification (Email, WhatsApp, In-App)
    dispatchNotification({
      recipientId: admission.patientId,
      recipientRole: 'patient',
      recipientName: admission.patientName,
      recipientEmail: patient?.email || '',
      recipientPhone: patient?.phone || '',
      type: 'INPATIENT_ADMISSION',
      data: {
        admissionId: admission.admissionId,
        patientId: admission.patientId,
        patientName: admission.patientName,
        ward: admission.ward,
        bedNumber: admission.bedNumber,
        doctorName: admission.doctorName,
        admittingDiagnosis: admission.admittingDiagnosis,
      },
      channels: ['email', 'whatsapp', 'in_app'],
      metadata: { admissionId: admission.admissionId, ward: admission.ward, bedNumber: admission.bedNumber },
    }).catch((err) => console.warn('[Admissions Dispatch Notification Warning]:', err.message));

    return NextResponse.json(
      {
        success: true,
        message: `Patient ${admission.patientName} admitted successfully to ${ward}, Bed ${admission.bedNumber}`,
        admission,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Bed is currently occupied by another active inpatient. Please select another bed.' },
        { status: 409 }
      );
    }
    console.error('[API Admissions POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to admit patient' },
      { status: 500 }
    );
  }
}
