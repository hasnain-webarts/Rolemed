import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute } from '@/lib/authGuard';
import { normalizePhoneForStorage } from '@/lib/phoneUtils';
import Patient from '@/models/Patient';
import Appointment from '@/models/Appointment';
import Admission from '@/models/Admission';
import Consultation from '@/models/Consultation';
import Prescription from '@/models/Prescription';
import LabOrder from '@/models/LabOrder';
import HospitalInvoice from '@/models/HospitalInvoice';

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician', 'patient']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { id } = await params;

    // Search by either patientId (e.g. PAT-001) or Mongo ObjectId
    const patient = await Patient.findOne({
      $or: [{ patientId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    }).lean();

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found in registry' },
        { status: 404 }
      );
    }

    // BOLA / IDOR Verification: If user is a patient, they can ONLY access their own record
    if (user.role === 'patient') {
      const isOwner = user.patientId && (user.patientId.toUpperCase() === patient.patientId.toUpperCase() || user.patientId === patient._id.toString());
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Access denied. You may only view your own medical health record.' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    // Attach related clinical records and invoices in parallel
    const [appointments, currentAdmission, allAdmissions, consultations, prescriptions, labOrders, invoices] = await Promise.all([
      Appointment.find({ patientId: patient.patientId }).sort({ date: -1 }).limit(50).lean(),
      Admission.findOne({ patientId: patient.patientId, status: 'Admitted' }).lean(),
      Admission.find({ patientId: patient.patientId }).sort({ admissionDate: -1 }).limit(20).lean(),
      Consultation.find({ patientId: patient.patientId }).sort({ createdAt: -1 }).limit(50).lean(),
      Prescription.find({ patientId: patient.patientId }).sort({ createdAt: -1 }).limit(50).lean(),
      LabOrder.find({ patientId: patient.patientId }).sort({ createdAt: -1 }).limit(50).lean(),
      HospitalInvoice.find({ patientId: patient.patientId }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      success: true,
      patient: {
        ...patient,
        appointments: appointments || [],
        currentAdmission: currentAdmission || null,
        allAdmissions: allAdmissions || [],
        consultations: consultations || [],
        prescriptions: prescriptions || [],
        labOrders: labOrders || [],
        invoices: invoices || [],
      },
    });
  } catch (error) {
    console.error('[API Patient [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching patient details' },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'receptionist', 'doctor']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    if (body.phone) body.phone = normalizePhoneForStorage(body.phone);
    if (body.emergencyPhone) body.emergencyPhone = normalizePhoneForStorage(body.emergencyPhone);
    if (body.emergencyContact && typeof body.emergencyContact === 'object' && body.emergencyContact.phone) {
      body.emergencyContact.phone = normalizePhoneForStorage(body.emergencyContact.phone);
    }

    const patient = await Patient.findOneAndUpdate(
      { $or: [{ patientId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found to update' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Patient profile updated successfully',
      patient,
    });
  } catch (error) {
    console.error('[API Patient [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update patient profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const patient = await Patient.findOneAndDelete({
      $or: [{ patientId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Patient ${patient.name} (${patient.patientId}) deleted from registry`,
    });
  } catch (error) {
    console.error('[API Patient [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
