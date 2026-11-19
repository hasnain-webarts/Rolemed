import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute } from '@/lib/authGuard';
import Patient from '@/models/Patient';
import Admission from '@/models/Admission';
import Appointment from '@/models/Appointment';
import Prescription from '@/models/Prescription';
import LabOrder from '@/models/LabOrder';
import LabInvoice from '@/models/LabInvoice';
import HospitalInvoice from '@/models/HospitalInvoice';
import HospitalSetting from '@/models/HospitalSetting';
import mongoose from 'mongoose';

/**
 * GET /api/billing/pending-charges?patientId=...
 * Aggregates all unbilled clinical charges across departments for a patient:
 * - Active inpatient bed stay accruals (days stayed × daily bed rate)
 * - Outpatient consultation appointments without an invoice
 * - Unpaid prescriptions pending dispensation
 * - Diagnostic lab tests without an invoice
 */
export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const patientQuery = searchParams.get('patientId')?.trim();

    if (!patientQuery) {
      return NextResponse.json(
        { success: false, error: 'Patient ID or search term is required' },
        { status: 400 }
      );
    }

    // Resolve patient by patientId (PAT-xxx) or Mongo ObjectId or Phone/CNIC
    const queryConditions = [{ patientId: patientQuery.toUpperCase() }];
    if (mongoose.Types.ObjectId.isValid(patientQuery)) {
      queryConditions.push({ _id: patientQuery });
    }
    queryConditions.push({ phone: patientQuery });
    queryConditions.push({ cnic: patientQuery });

    const patient = await Patient.findOne({ $or: queryConditions });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: `Patient '${patientQuery}' not found in hospital registry` },
        { status: 404 }
      );
    }

    const settings = await HospitalSetting.getSettings();
    const pid = patient.patientId;

    // 1. Inpatient Bed Stay Accrual
    let admissionCharge = null;
    const activeAdmission = await Admission.findOne({
      patientId: pid,
      status: 'Admitted',
    }).lean();

    if (activeAdmission) {
      const admissionTime = new Date(activeAdmission.admissionDate).getTime();
      const diffMs = Math.max(0, Date.now() - admissionTime);
      const stayDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      let dailyRate = settings.pricingRules?.dailyBedRateGeneralWard || 1500;
      const wardUpper = (activeAdmission.ward || '').toUpperCase();
      if (wardUpper.includes('ICU') || wardUpper.includes('INTENSIVE')) {
        dailyRate = settings.pricingRules?.dailyBedRateICU || 8000;
      } else if (wardUpper.includes('EMERGENCY') || wardUpper.includes('ER') || wardUpper.includes('TRAUMA')) {
        dailyRate = settings.pricingRules?.dailyBedRateEmergency || 2000;
      }

      const totalBedCharge = stayDays * dailyRate;
      admissionCharge = {
        admissionId: activeAdmission.admissionId,
        ward: activeAdmission.ward,
        bedNumber: activeAdmission.bedNumber,
        admissionDate: activeAdmission.admissionDate,
        stayDays,
        dailyRate,
        totalCharge: totalBedCharge,
        doctorName: activeAdmission.doctorName || 'Attending Physician',
      };
    }

    // 2. Fetch existing HospitalInvoice referenceIds to avoid duplicate billing
    const existingInvoices = await HospitalInvoice.find({
      patientId: pid,
      paymentStatus: { $in: ['Paid', 'Unpaid'] },
    }).select('items.referenceId').lean();

    const billedRefIds = new Set();
    existingInvoices.forEach((inv) => {
      (inv.items || []).forEach((it) => {
        if (it.referenceId) billedRefIds.add(it.referenceId);
      });
    });

    // 3. Unbilled Appointments
    const appointments = await Appointment.find({
      patientId: pid,
      status: { $in: ['Scheduled', 'Confirmed', 'In Consultation', 'Completed'] },
    }).lean();

    const pendingAppointments = appointments
      .filter((apt) => !billedRefIds.has(apt.appointmentId || apt._id.toString()))
      .map((apt) => {
        const fee = Number(apt.fee) > 0 ? Number(apt.fee) : (settings.pricingRules?.standardConsultationFee || 1000);
        return {
          appointmentId: apt.appointmentId || apt._id.toString(),
          doctorName: apt.doctorName || apt.doctor || 'Consulting Physician',
          department: apt.department || 'Outpatient Clinic',
          date: apt.date,
          time: apt.time,
          fee,
        };
      });

    // 4. Unpaid Prescriptions
    const prescriptions = await Prescription.find({
      patientId: pid,
      paymentStatus: 'Unpaid',
      status: { $ne: 'Cancelled' },
    }).lean();

    const pendingPrescriptions = prescriptions
      .filter((rx) => !billedRefIds.has(rx.consultationId || rx._id.toString()))
      .map((rx) => {
        const total = Number(rx.totalAmount) || (rx.drugs || []).reduce((acc, d) => acc + (Number(d.totalPrice) || (Number(d.unitPrice || 0) * Number(d.qtyNeeded || 1))), 0);
        return {
          prescriptionId: rx._id.toString(),
          consultationId: rx.consultationId || 'Rx-Standard',
          doctorName: rx.doctorName || 'Physician',
          drugCount: rx.drugs?.length || 0,
          drugs: (rx.drugs || []).map((d) => ({
            name: d.name,
            dosage: d.dosage,
            qtyNeeded: d.qtyNeeded,
            unitPrice: d.unitPrice || 0,
            totalPrice: d.totalPrice || (d.unitPrice * d.qtyNeeded) || 0,
          })),
          totalAmount: total,
        };
      });

    // 5. Unbilled Diagnostic Lab Tests
    const paidLabInvoices = await LabInvoice.find({
      patientId: pid,
      paymentStatus: 'Paid',
    }).select('orderId').lean();

    const paidLabOrderIds = new Set(paidLabInvoices.map((inv) => inv.orderId).filter(Boolean));

    const labOrders = await LabOrder.find({
      patientId: pid,
      status: { $nin: ['Cancelled', 'Specimen Rejected'] },
    }).lean();

    const pendingLabOrders = labOrders
      .filter((order) => !paidLabOrderIds.has(order.orderId) && !billedRefIds.has(order.orderId))
      .map((order) => {
        const standardTestFee = 800; // Standard nominal lab panel charge
        return {
          orderId: order.orderId,
          testName: order.testName,
          priority: order.priority || 'Routine',
          doctorName: order.doctorName || 'Pathologist',
          date: order.date,
          fee: standardTestFee,
        };
      });

    // Aggregate subtotal
    const bedTotal = admissionCharge ? admissionCharge.totalCharge : 0;
    const appointmentTotal = pendingAppointments.reduce((s, a) => s + a.fee, 0);
    const rxTotal = pendingPrescriptions.reduce((s, r) => s + r.totalAmount, 0);
    const labTotal = pendingLabOrders.reduce((s, l) => s + l.fee, 0);
    const grandTotal = bedTotal + appointmentTotal + rxTotal + labTotal;

    return NextResponse.json({
      success: true,
      patient: {
        _id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        phone: patient.phone,
        gender: patient.gender,
        age: patient.age,
        bloodGroup: patient.bloodGroup,
      },
      billingMode: settings.billingMode,
      pricingRules: settings.pricingRules,
      charges: {
        admission: admissionCharge,
        appointments: pendingAppointments,
        prescriptions: pendingPrescriptions,
        labOrders: pendingLabOrders,
      },
      totals: {
        bedStay: bedTotal,
        consultation: appointmentTotal,
        pharmacy: rxTotal,
        laboratory: labTotal,
        grandTotal,
        currency: 'PKR',
      },
    });
  } catch (error) {
    console.error('[API Pending Charges GET Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error calculating pending hospital charges' },
      { status: 500 }
    );
  }
}
