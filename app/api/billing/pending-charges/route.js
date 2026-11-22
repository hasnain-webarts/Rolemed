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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/billing/pending-charges
 * Query Parameters:
 * - patientId (optional): Single patient lookup.
 * - department (optional): Caller department ('Reception', 'Pharmacy', 'Laboratory'). Defaults to 'Reception'.
 *
 * Supports:
 * 1. Batch Unpaid Queue (when patientId is omitted): Returns all patients with pending charges allowed for the caller's desk.
 * 2. Single Patient Lookup (when patientId is provided): Returns detailed itemized charges allowed for the caller's desk.
 */
export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const patientQuery = searchParams.get('patientId')?.trim();
    const departmentParam = searchParams.get('department')?.trim() || 'Reception';
    const deptKey = departmentParam.toLowerCase();

    const settings = await HospitalSetting.getSettings();
    const deptConfig = settings.departmentBillingConfig || {
      reception: { enabled: true, mode: 'merged', isFinal: true },
      pharmacy: { enabled: false, mode: 'merged', isFinal: false },
      laboratory: { enabled: false, mode: 'separate', isFinal: false },
    };

    const callerCfg = deptConfig[deptKey] || { enabled: true, mode: 'merged', isFinal: deptKey === 'reception' };

    // Determine which departmental charges this desk can bill
    const canBillReception =
      deptKey === 'reception' ||
      (callerCfg.mode === 'merged' && callerCfg.isFinal && deptConfig.reception?.mode === 'merged');

    const canBillPharmacy =
      deptKey === 'pharmacy' ||
      (callerCfg.mode === 'merged' && callerCfg.isFinal && deptConfig.pharmacy?.mode === 'merged');

    const canBillLaboratory =
      deptKey === 'laboratory' ||
      (callerCfg.mode === 'merged' && callerCfg.isFinal && deptConfig.laboratory?.mode === 'merged');

    // Fetch billed reference IDs to prevent duplicate charging
    const existingInvoices = await HospitalInvoice.find({
      paymentStatus: { $in: ['Paid', 'Unpaid'] },
    }).select('items.referenceId').lean();

    const billedRefIds = new Set();
    existingInvoices.forEach((inv) => {
      (inv.items || []).forEach((it) => {
        if (it.referenceId) billedRefIds.add(it.referenceId);
      });
    });

    const paidLabInvoices = await LabInvoice.find({
      paymentStatus: 'Paid',
    }).select('orderId').lean();
    const paidLabOrderIds = new Set(paidLabInvoices.map((inv) => inv.orderId).filter(Boolean));

    // Helper to calculate admission stay charge
    const calculateAdmissionCharge = (adm) => {
      if (!adm) return null;
      const admissionTime = new Date(adm.admissionDate).getTime();
      const diffMs = Math.max(0, Date.now() - admissionTime);
      const stayDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      let dailyRate = settings.pricingRules?.dailyBedRateGeneralWard || 1500;
      const wardUpper = (adm.ward || '').toUpperCase();
      if (wardUpper.includes('ICU') || wardUpper.includes('INTENSIVE')) {
        dailyRate = settings.pricingRules?.dailyBedRateICU || 8000;
      } else if (wardUpper.includes('EMERGENCY') || wardUpper.includes('ER') || wardUpper.includes('TRAUMA')) {
        dailyRate = settings.pricingRules?.dailyBedRateEmergency || 2000;
      }

      return {
        admissionId: adm.admissionId,
        ward: adm.ward,
        bedNumber: adm.bedNumber,
        admissionDate: adm.admissionDate,
        stayDays,
        dailyRate,
        totalCharge: stayDays * dailyRate,
        doctorName: adm.doctorName || 'Attending Physician',
      };
    };

    // ==========================================
    // CASE A: Batch Unpaid Patients Queue
    // ==========================================
    if (!patientQuery) {
      // 1. Gather all candidates across departments
      const [allAdmissions, allAppointments, allPrescriptions, allLabOrders] = await Promise.all([
        canBillReception ? Admission.find({ status: 'Admitted' }).lean() : Promise.resolve([]),
        canBillReception
          ? Appointment.find({
              status: { $in: ['Scheduled', 'Confirmed', 'In Consultation', 'Completed'] },
            }).lean()
          : Promise.resolve([]),
        canBillPharmacy
          ? Prescription.find({
              paymentStatus: 'Unpaid',
              status: { $ne: 'Cancelled' },
            }).lean()
          : Promise.resolve([]),
        canBillLaboratory
          ? LabOrder.find({
              status: { $nin: ['Cancelled', 'Specimen Rejected'] },
            }).lean()
          : Promise.resolve([]),
      ]);

      // Filter unbilled
      const filteredAppointments = allAppointments.filter(
        (apt) => !billedRefIds.has(apt.appointmentId || apt._id.toString())
      );
      const filteredPrescriptions = allPrescriptions.filter(
        (rx) => !billedRefIds.has(rx.consultationId || rx._id.toString())
      );
      const filteredLabOrders = allLabOrders.filter(
        (order) => !paidLabOrderIds.has(order.orderId) && !billedRefIds.has(order.orderId)
      );

      // Collect patient IDs
      const patientIdMap = new Map();

      // Inpatients
      allAdmissions.forEach((adm) => {
        if (!adm.patientId) return;
        const pid = adm.patientId.toUpperCase();
        if (!patientIdMap.has(pid)) {
          patientIdMap.set(pid, { admission: adm, appointments: [], prescriptions: [], labOrders: [] });
        } else {
          patientIdMap.get(pid).admission = adm;
        }
      });

      // Appointments
      filteredAppointments.forEach((apt) => {
        if (!apt.patientId) return;
        const pid = apt.patientId.toUpperCase();
        if (!patientIdMap.has(pid)) {
          patientIdMap.set(pid, { admission: null, appointments: [apt], prescriptions: [], labOrders: [] });
        } else {
          patientIdMap.get(pid).appointments.push(apt);
        }
      });

      // Prescriptions
      filteredPrescriptions.forEach((rx) => {
        if (!rx.patientId) return;
        const pid = rx.patientId.toUpperCase();
        if (!patientIdMap.has(pid)) {
          patientIdMap.set(pid, { admission: null, appointments: [], prescriptions: [rx], labOrders: [] });
        } else {
          patientIdMap.get(pid).prescriptions.push(rx);
        }
      });

      // Lab Orders
      filteredLabOrders.forEach((lab) => {
        if (!lab.patientId) return;
        const pid = lab.patientId.toUpperCase();
        if (!patientIdMap.has(pid)) {
          patientIdMap.set(pid, { admission: null, appointments: [], prescriptions: [], labOrders: [lab] });
        } else {
          patientIdMap.get(pid).labOrders.push(lab);
        }
      });

      const pids = Array.from(patientIdMap.keys());
      if (pids.length === 0) {
        return NextResponse.json({
          success: true,
          department: departmentParam,
          deskConfig: callerCfg,
          allowedCategories: { canBillReception, canBillPharmacy, canBillLaboratory },
          count: 0,
          patients: [],
        });
      }

      const patientDocs = await Patient.find({ patientId: { $in: pids } }).lean();
      const patientDocMap = new Map(patientDocs.map((p) => [p.patientId.toUpperCase(), p]));

      const results = [];
      pids.forEach((pid) => {
        const pDoc = patientDocMap.get(pid) || { patientId: pid, name: `Patient ${pid}`, phone: '' };
        const entry = patientIdMap.get(pid);

        let bedCharge = 0;
        let admissionDetails = null;
        if (entry.admission) {
          admissionDetails = calculateAdmissionCharge(entry.admission);
          bedCharge = admissionDetails ? admissionDetails.totalCharge : 0;
        }

        const consultTotal = entry.appointments.reduce((sum, apt) => {
          const fee = Number(apt.fee) > 0 ? Number(apt.fee) : (settings.pricingRules?.standardConsultationFee || 1000);
          return sum + fee;
        }, 0);

        const rxTotal = entry.prescriptions.reduce((sum, rx) => {
          const total = Number(rx.totalAmount) || (rx.drugs || []).reduce(
            (acc, d) => acc + (Number(d.totalPrice) || (Number(d.unitPrice || 0) * Number(d.qtyNeeded || 1))),
            0
          );
          return sum + total;
        }, 0);

        const labTotal = entry.labOrders.length * 800; // Standard nominal lab fee
        const totalUnpaid = bedCharge + consultTotal + rxTotal + labTotal;

        if (totalUnpaid > 0) {
          const badges = [];
          if (admissionDetails) {
            badges.push(`${admissionDetails.ward} (${admissionDetails.stayDays}d)`);
          }
          if (entry.appointments.length > 0) {
            badges.push(`${entry.appointments.length} Consult`);
          }
          if (entry.prescriptions.length > 0) {
            badges.push(`${entry.prescriptions.length} Rx`);
          }
          if (entry.labOrders.length > 0) {
            badges.push(`${entry.labOrders.length} Lab`);
          }

          results.push({
            patientId: pDoc.patientId,
            _id: pDoc._id,
            name: pDoc.name,
            phone: pDoc.phone || '',
            age: pDoc.age,
            gender: pDoc.gender,
            bloodGroup: pDoc.bloodGroup,
            isAdmitted: Boolean(entry.admission),
            ward: entry.admission?.ward || null,
            bedNumber: entry.admission?.bedNumber || null,
            admissionCharge: bedCharge,
            consultationCharges: consultTotal,
            prescriptionCharges: rxTotal,
            labCharges: labTotal,
            totalUnpaid,
            badges,
            breakdownCounts: {
              admissions: entry.admission ? 1 : 0,
              appointments: entry.appointments.length,
              prescriptions: entry.prescriptions.length,
              labOrders: entry.labOrders.length,
            },
          });
        }
      });

      // Sort with highest unpaid charges first
      results.sort((a, b) => b.totalUnpaid - a.totalUnpaid);

      return NextResponse.json({
        success: true,
        department: departmentParam,
        deskConfig: callerCfg,
        allowedCategories: { canBillReception, canBillPharmacy, canBillLaboratory },
        count: results.length,
        patients: results,
      });
    }

    // ==========================================
    // CASE B: Single Patient Lookup
    // ==========================================
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

    const pid = patient.patientId;

    // 1. Inpatient Bed Stay
    let admissionCharge = null;
    if (canBillReception) {
      const activeAdmission = await Admission.findOne({
        patientId: pid,
        status: 'Admitted',
      }).lean();
      if (activeAdmission) {
        admissionCharge = calculateAdmissionCharge(activeAdmission);
      }
    }

    // 2. Unbilled Appointments
    let pendingAppointments = [];
    if (canBillReception) {
      const appointments = await Appointment.find({
        patientId: pid,
        status: { $in: ['Scheduled', 'Confirmed', 'In Consultation', 'Completed'] },
      }).lean();

      pendingAppointments = appointments
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
    }

    // 3. Unpaid Prescriptions
    let pendingPrescriptions = [];
    if (canBillPharmacy) {
      const prescriptions = await Prescription.find({
        patientId: pid,
        paymentStatus: 'Unpaid',
        status: { $ne: 'Cancelled' },
      }).lean();

      pendingPrescriptions = prescriptions
        .filter((rx) => !billedRefIds.has(rx.consultationId || rx._id.toString()))
        .map((rx) => {
          const total = Number(rx.totalAmount) || (rx.drugs || []).reduce(
            (acc, d) => acc + (Number(d.totalPrice) || (Number(d.unitPrice || 0) * Number(d.qtyNeeded || 1))),
            0
          );
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
    }

    // 4. Unbilled Diagnostic Lab Tests
    let pendingLabOrders = [];
    if (canBillLaboratory) {
      const labOrders = await LabOrder.find({
        patientId: pid,
        status: { $nin: ['Cancelled', 'Specimen Rejected'] },
      }).lean();

      pendingLabOrders = labOrders
        .filter((order) => !paidLabOrderIds.has(order.orderId) && !billedRefIds.has(order.orderId))
        .map((order) => ({
          orderId: order.orderId,
          testName: order.testName,
          priority: order.priority || 'Routine',
          doctorName: order.doctorName || 'Pathologist',
          date: order.date,
          fee: 800,
        }));
    }

    const bedTotal = admissionCharge ? admissionCharge.totalCharge : 0;
    const appointmentTotal = pendingAppointments.reduce((s, a) => s + a.fee, 0);
    const rxTotal = pendingPrescriptions.reduce((s, r) => s + r.totalAmount, 0);
    const labTotal = pendingLabOrders.reduce((s, l) => s + l.fee, 0);
    const grandTotal = bedTotal + appointmentTotal + rxTotal + labTotal;

    return NextResponse.json({
      success: true,
      department: departmentParam,
      deskConfig: callerCfg,
      allowedCategories: { canBillReception, canBillPharmacy, canBillLaboratory },
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
        subtotals: {
          bedStay: bedTotal,
          appointments: appointmentTotal,
          prescriptions: rxTotal,
          laboratory: labTotal,
        },
        grandTotal,
      },
    });
  } catch (error) {
    console.error('[API Billing Pending Charges Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while resolving pending charges' },
      { status: 500 }
    );
  }
}
