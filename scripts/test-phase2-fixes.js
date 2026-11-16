import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../db/connectDB.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import LabOrder from '../models/LabOrder.js';
import Admission from '../models/Admission.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.NEXTAUTH_SECRET || '9be35f49dcf46820ff569a9b70b555ea25b42c129e92bfbe2a2818cdbe4a0b2c';

const adminHeaders = {
  'Content-Type': 'application/json',
  'x-internal-key': SECRET,
  'x-user-role': 'admin',
};

console.log('====================================================');
console.log('🧪 Starting Phase 2 Workflow Correctness Tests');
console.log('====================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function record(desc, ok) {
    total++;
    if (ok) {
      passed++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  }

  await connectDB();

  try {
    // ----------------------------------------------------
    // Test Group 1: Doctor Leave Conflict Detection (RM-WF-001)
    // ----------------------------------------------------
    console.log('--- Test Group 1: Doctor Leave Conflict Detection (RM-WF-001) ---');

    const doctorUser = await User.findOne({ role: 'doctor' });
    assert(doctorUser !== null, 'Found doctor user in database');

    const testLeaveId = `LV-CONFLICT-${Date.now()}`;
    const conflictDate = '2027-08-15';
    const leaveStart = '2027-08-10';
    const leaveEnd = '2027-08-20';

    // 1. Create a pre-existing scheduled appointment during the future leave window
    const testAptId = `APT-CONF-${Date.now()}`;
    await Appointment.create({
      appointmentId: testAptId,
      patientId: 'PAT-001',
      patientName: 'John Doe',
      doctor: doctorUser._id,
      doctorName: doctorUser.name,
      date: conflictDate,
      time: '10:00 AM',
      reason: 'Hypertension evaluation before doctor conference',
      status: 'Scheduled',
    });

    // 2. Add pending leave to doctor
    await User.updateOne(
      { _id: doctorUser._id },
      {
        $push: {
          leaves: {
            id: testLeaveId,
            startDate: leaveStart,
            endDate: leaveEnd,
            reason: 'International Cardiology Symposium',
            status: 'Pending Approval',
          },
        },
      }
    );

    // 3. Admin approves leave via PATCH /api/admin/leaves
    const leaveApproveRes = await fetch(`${BASE_URL}/api/admin/leaves`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        doctorId: doctorUser._id.toString(),
        leaveId: testLeaveId,
        status: 'Approved',
        reviewNote: 'Approved by Chief Medical Officer',
      }),
    });
    const leaveApproveData = await leaveApproveRes.json();

    record(
      'Leave approval API responds with success',
      leaveApproveRes.status === 200 && leaveApproveData.success === true
    );
    record(
      'Leave approval detects and reports conflictCount >= 1',
      leaveApproveData.conflictCount >= 1
    );
    record(
      'Leave approval returns array containing the conflicting appointment ID',
      Array.isArray(leaveApproveData.conflicts) &&
        leaveApproveData.conflicts.some((c) => c.appointmentId === testAptId)
    );

    // 4. Verify conflicting appointment was updated in DB to 'Reschedule Required'
    const updatedApt = await Appointment.findOne({ appointmentId: testAptId }).lean();
    record(
      'Conflicting appointment status was updated to "Reschedule Required"',
      updatedApt?.status === 'Reschedule Required'
    );
    record(
      'Conflicting appointment notes contain leave explanation',
      updatedApt?.notes?.includes('approved leave')
    );

    // Clean up Test 1
    await Appointment.deleteOne({ appointmentId: testAptId });
    await User.updateOne(
      { _id: doctorUser._id },
      { $pull: { leaves: { id: testLeaveId } } }
    );

    // ----------------------------------------------------
    // Test Group 2: Appointment No-Show Status (RM-WF-002)
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Appointment No-Show Transition (RM-WF-002) ---');

    const noShowAptId = `APT-NOSHOW-${Date.now()}`;
    await Appointment.create({
      appointmentId: noShowAptId,
      patientId: 'PAT-001',
      patientName: 'John Doe',
      doctorName: doctorUser.name,
      date: '2026-12-10',
      reason: 'General Checkup',
      status: 'Scheduled',
    });

    const noShowRes = await fetch(`${BASE_URL}/api/appointments/${noShowAptId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'No-Show' }),
    });
    const noShowData = await noShowRes.json();

    record(
      'PATCH /api/appointments/:id with status "No-Show" returns HTTP 200',
      noShowRes.status === 200 && noShowData.success === true
    );

    const verifiedNoShow = await Appointment.findOne({ appointmentId: noShowAptId }).lean();
    record(
      'Appointment record in MongoDB correctly holds status "No-Show"',
      verifiedNoShow?.status === 'No-Show'
    );

    await Appointment.deleteOne({ appointmentId: noShowAptId });

    // ----------------------------------------------------
    // Test Group 3: Lab Specimen Rejection Workflow (RM-WF-004)
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: Lab Specimen Rejection & Recollection (RM-WF-004) ---');

    const testLabOrderId = `REQ-REJ-${Date.now()}`;
    await LabOrder.create({
      orderId: testLabOrderId,
      patient: doctorUser._id, // placeholder valid ObjectId
      patientId: 'PAT-001',
      patientName: 'John Doe',
      testName: 'Complete Blood Count (CBC)',
      status: 'In Progress',
    });

    // 1. Reject specimen with clinical rationale
    const rejectReason = 'Grossly hemolyzed blood sample, unsuitable for accurate optical cell count';
    const rejectRes = await fetch(`${BASE_URL}/api/lab-orders/${testLabOrderId}`, {
      method: 'PATCH',
      headers: {
        ...adminHeaders,
        'x-user-role': 'lab-technician',
        'x-user-name': 'Quality Lab Tech',
      },
      body: JSON.stringify({
        status: 'Specimen Rejected',
        rejectionReason: rejectReason,
      }),
    });
    const rejectData = await rejectRes.json();

    record(
      'PATCH /api/lab-orders/:id with "Specimen Rejected" returns HTTP 200',
      rejectRes.status === 200 && rejectData.success === true
    );

    const dbRejected = await LabOrder.findOne({ orderId: testLabOrderId }).lean();
    record(
      'Lab order status in MongoDB updated to "Specimen Rejected"',
      dbRejected?.status === 'Specimen Rejected'
    );
    record(
      'Rejection reason and timestamp properly recorded in LabOrder document',
      dbRejected?.rejectionReason === rejectReason && dbRejected?.rejectedAt !== undefined
    );

    // 2. Request Recollection
    const recollectRes = await fetch(`${BASE_URL}/api/lab-orders/${testLabOrderId}`, {
      method: 'PATCH',
      headers: {
        ...adminHeaders,
        'x-user-role': 'lab-technician',
      },
      body: JSON.stringify({
        status: 'Recollection Requested',
      }),
    });
    const recollectData = await recollectRes.json();

    record(
      'Transition from "Specimen Rejected" to "Recollection Requested" succeeds',
      recollectRes.status === 200 && recollectData.labOrder?.status === 'Recollection Requested'
    );

    await LabOrder.deleteOne({ orderId: testLabOrderId });

    // ----------------------------------------------------
    // Test Group 4: Inpatient Bed Transfer & Collision Protection (RM-WF-005)
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Inpatient Bed Transfer & Collision Check (RM-WF-005) ---');

    const adm1Id = `ADM-XFER1-${Date.now()}`;
    const adm2Id = `ADM-XFER2-${Date.now()}`;

    // Clean up potential leftover test beds
    await Admission.deleteMany({ admissionId: { $in: [adm1Id, adm2Id] } });

    await Admission.create({
      admissionId: adm1Id,
      patientId: 'PAT-001',
      patientName: 'Transfer Patient One',
      ward: 'General Ward A',
      bedNumber: 'A-109',
      doctorName: 'Dr. Sarah Jenkins',
      admittingDiagnosis: 'Chest Observation',
      status: 'Admitted',
    });

    await Admission.create({
      admissionId: adm2Id,
      patientId: 'PAT-002',
      patientName: 'Transfer Patient Two',
      ward: 'General Ward A',
      bedNumber: 'A-110',
      doctorName: 'Dr. Sarah Jenkins',
      admittingDiagnosis: 'Post-op recovery',
      status: 'Admitted',
    });

    // 1. Attempt transfer into occupied bed (A-110 is occupied by Patient Two)
    const collisionXferRes = await fetch(`${BASE_URL}/api/admissions/${adm1Id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        ward: 'General Ward A',
        bedNumber: 'A-110',
        transferReason: 'Patient wants window bed',
      }),
    });
    const collisionXferData = await collisionXferRes.json();

    record(
      'Bed transfer into occupied bed (A-110) is rejected with HTTP 409 Conflict',
      collisionXferRes.status === 409
    );
    record(
      'Conflict error specifies bed is currently occupied by other patient',
      collisionXferData.error?.includes('occupied')
    );

    // 2. Transfer into vacant bed (ICU-05)
    const validXferRes = await fetch(`${BASE_URL}/api/admissions/${adm1Id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        ward: 'ICU',
        bedNumber: 'ICU-05',
        transferReason: 'Condition deteriorated, transferred for intensive monitoring',
      }),
    });
    const validXferData = await validXferRes.json();

    record(
      'Bed transfer into vacant bed (ICU-05) succeeds with HTTP 200',
      validXferRes.status === 200 && validXferData.success === true
    );

    const verifiedXferAdm = await Admission.findOne({ admissionId: adm1Id }).lean();
    record(
      'Admission document ward and bed updated to ICU (ICU-05)',
      verifiedXferAdm?.ward === 'ICU' && verifiedXferAdm?.bedNumber === 'ICU-05'
    );
    record(
      'Admission transferHistory array records prior placement and timestamp',
      Array.isArray(verifiedXferAdm?.transferHistory) &&
        verifiedXferAdm.transferHistory.length > 0 &&
        verifiedXferAdm.transferHistory[0].fromWard === 'General Ward A' &&
        verifiedXferAdm.transferHistory[0].fromBed === 'A-109' &&
        verifiedXferAdm.transferHistory[0].toWard === 'ICU' &&
        verifiedXferAdm.transferHistory[0].toBed === 'ICU-05'
    );

    // Clean up test admissions
    await Admission.deleteMany({ admissionId: { $in: [adm1Id, adm2Id] } });

  } catch (err) {
    console.error('Fatal error during Phase 2 test execution:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n====================================================');
    console.log(`🏁 Phase 2 Test Execution Complete: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
    console.log('====================================================');
    process.exit(passed === total ? 0 : 1);
  }
}

runTests();

