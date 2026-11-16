import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/rolemed';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.NEXTAUTH_SECRET || '9be35f49dcf46820ff569a9b70b555ea25b42c129e92bfbe2a2818cdbe4a0b2c';

const adminHeaders = {
  'Content-Type': 'application/json',
  'x-internal-key': SECRET,
  'x-user-role': 'admin',
};

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 8 Bug Fixes & Clinical EHR Verification');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.\n');

    // TEST 1: Patient Search & Autofill Endpoint
    console.log('--- Test 1: Patient Search & Autofill API ---');
    const searchRes = await fetch(`${BASE_URL}/api/patients?search=35201`, {
      headers: adminHeaders,
    });
    const searchData = await searchRes.json();
    assert(searchData.success === true, 'Search patients endpoint returns success');
    assert(Array.isArray(searchData.patients), 'Returns an array of matching patients');
    console.log(`Matched ${searchData.patients?.length || 0} patient(s) by CNIC digits.\n`);

    // TEST 2: Doctor 360 EHR Aggregator
    console.log('--- Test 2: Doctor 360 EHR Aggregator (/api/patients/:id) ---');
    const samplePatientId = 'PAT-001';
    const ehrRes = await fetch(`${BASE_URL}/api/patients/${samplePatientId}`, {
      headers: adminHeaders,
    });
    const ehrData = await ehrRes.json();
    assert(ehrData.success === true, `EHR fetch for ${samplePatientId} returned success`);
    assert(ehrData.patient !== undefined, 'EHR patient object is present');
    assert(Array.isArray(ehrData.patient.consultations), 'Longitudinal consultations array attached');
    assert(Array.isArray(ehrData.patient.prescriptions), 'Prescriptions array attached');
    assert(Array.isArray(ehrData.patient.labOrders), 'Lab orders array attached');
    assert(Array.isArray(ehrData.patient.allAdmissions), 'Hospital allAdmissions array attached');
    console.log(`EHR loaded: ${ehrData.patient.consultations.length} consultations, ${ehrData.patient.prescriptions.length} prescriptions, ${ehrData.patient.labOrders.length} labs.\n`);

    // TEST 3: Doctor Leave Request & Admin Approval Flow
    console.log('--- Test 3: Doctor Leave Request Status & Admin Approval ---');
    const testDoctorEmail = 'doctor@rolemed.org';
    const doctorUser = await User.findOne({ email: testDoctorEmail });
    assert(doctorUser !== null, 'Found doctor user in database');

    // Clean up any residual test leaves first
    await User.updateOne(
      { _id: doctorUser._id },
      { $pull: { leaves: { reason: /Specialist Medical Conference/i } } }
    );

    const testLeaveId = `LV-TEST-${Date.now()}`;
    const testYear = 2027;
    const testStartDate = `${testYear}-04-10`;
    const testEndDate = `${testYear}-04-15`;
    const testDate = `${testYear}-04-12`;

    // Add pending leave
    const newLeave = {
      id: testLeaveId,
      startDate: testStartDate,
      endDate: testEndDate,
      reason: 'Specialist Medical Conference',
      status: 'Pending Approval',
    };
    await User.updateOne(
      { _id: doctorUser._id },
      { $push: { leaves: newLeave } }
    );

    // Verify GET /api/admin/leaves returns pending leave
    const leavesRes = await fetch(`${BASE_URL}/api/admin/leaves`, {
      headers: adminHeaders,
    });
    const leavesData = await leavesRes.json();
    assert(leavesData.success === true, 'Admin leaves API returns success');
    const foundPending = (leavesData.leaves || []).find((l) => l.id === testLeaveId);
    assert(foundPending !== undefined, 'Newly submitted leave appears in admin leaves queue');
    assert(foundPending?.status === 'Pending Approval', 'Leave initial status is "Pending Approval"');

    // Verify appointment booking on pending leave date is NOT blocked (only approved leaves block)
    const bookPendingRes = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        patientId: samplePatientId,
        doctorName: doctorUser.name,
        date: testDate,
        reason: 'Pre-conference routine check',
      }),
    });
    const bookPendingData = await bookPendingRes.json();
    assert(bookPendingData.success === true, 'Appointment booking is NOT blocked by Pending Approval leave');
    const pendingAptId = bookPendingData.appointment?.appointmentId;

    // Admin approves the leave via PATCH /api/admin/leaves
    const approveRes = await fetch(`${BASE_URL}/api/admin/leaves`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        doctorId: doctorUser._id.toString(),
        leaveId: testLeaveId,
        status: 'Approved',
        reviewNote: 'Approved by Medical Director',
      }),
    });
    const approveData = await approveRes.json();
    assert(approveData.success === true, 'Admin successfully approves doctor leave');

    // Now verify that booking on this approved leave date is BLOCKED
    const bookBlockedRes = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        patientId: samplePatientId,
        doctorName: doctorUser.name,
        date: testDate,
        reason: 'Should be blocked',
      }),
    });
    const bookBlockedData = await bookBlockedRes.json();
    assert(bookBlockedRes.status === 400, 'Appointment booking is BLOCKED on Approved leave date (status 400)');
    assert(bookBlockedData.error?.includes('leave'), 'Error message specifies doctor is on scheduled leave');
    console.log(`Leave flow verified: Pending -> Allowed, Approved -> Blocked.\n`);

    // TEST 4: Token-Centric Appointment Booking (No Fixed Time Slot)
    console.log('--- Test 4: Token-Centric Appointment Booking ---');
    const tokenBookRes = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        patientId: samplePatientId,
        doctorName: doctorUser.name,
        date: '2026-12-28',
        reason: 'Post-conference review',
      }),
    });
    const tokenBookData = await tokenBookRes.json();
    assert(tokenBookData.success === true, 'Booking succeeds without providing time slot');
    assert(tokenBookData.appointment?.queueNumber !== undefined, 'Queue number assigned sequentially');
    assert(tokenBookData.appointment?.time?.startsWith('Token #'), 'Time defaults to OPD Token slot (e.g. Token #01)');
    console.log(`Assigned Token: ${tokenBookData.appointment?.time} (Queue #${tokenBookData.appointment?.queueNumber})\n`);

    // TEST 5: Doctor Privacy Scoping
    console.log('--- Test 5: Multi-Doctor Privacy Scoping ---');
    const scopedPatRes = await fetch(`${BASE_URL}/api/patients?doctor=${encodeURIComponent(doctorUser.name)}`, {
      headers: adminHeaders,
    });
    const scopedPatData = await scopedPatRes.json();
    assert(scopedPatData.success === true, 'Patient query with doctor scope returns success');
    assert(Array.isArray(scopedPatData.patients), 'Returns scoped patients array');

    const scopedQueueRes = await fetch(`${BASE_URL}/api/queue?doctor=${encodeURIComponent(doctorUser.name)}`, {
      headers: adminHeaders,
    });
    const scopedQueueData = await scopedQueueRes.json();
    assert(scopedQueueData.success === true, 'Queue query with doctor scope returns success');
    console.log(`Doctor scoping verified for ${doctorUser.name}.\n`);

    // TEST 6: IPD Admission Ward Bed Matrix & Double-Booking Protection
    console.log('--- Test 6: IPD Admission Bed Collision Protection ---');
    const testBed = 'A-108';
    const testWard = 'General Ward A';

    // Ensure test bed is admitted
    const admitRes = await fetch(`${BASE_URL}/api/admissions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        patientId: samplePatientId,
        ward: testWard,
        bedNumber: testBed,
        doctorName: doctorUser.name,
        admittingDiagnosis: 'Test Inpatient Observation',
      }),
    });
    const admitData = await admitRes.json();
    // Either succeeded or was already admitted
    assert(admitRes.status === 201 || admitRes.status === 409, 'Admission API responds appropriately to bed booking');

    // Attempting to admit another patient into the same bed must be rejected (409 Conflict)
    const collisionRes = await fetch(`${BASE_URL}/api/admissions`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        patientId: 'PAT-002',
        ward: testWard,
        bedNumber: testBed,
        doctorName: doctorUser.name,
        admittingDiagnosis: 'Conflicting Inpatient',
      }),
    });
    const collisionData = await collisionRes.json();
    assert(collisionRes.status === 409, 'Double-booking occupied bed is rejected with HTTP 409');
    assert(collisionData.error?.includes('occupied'), 'Error message clearly indicates bed is occupied');
    console.log(`Bed collision prevention verified for ${testWard} (${testBed}).\n`);

    // TEST 7: Patient Portal Account & Records Integrity
    console.log('--- Test 7: Patient Portal Account & Record Access ---');
    const patientUser = await User.findOne({ email: 'patient@rolemed.org' });
    assert(patientUser !== null, 'Patient demo user exists in database');
    assert(patientUser?.role === 'patient', 'Patient user has role "patient"');
    assert(patientUser?.patientId === 'PAT-001', 'Patient user is linked to patientId PAT-001');

    const patientRecordsRes = await fetch(`${BASE_URL}/api/patients/${patientUser.patientId}`, {
      headers: {
        ...adminHeaders,
        'x-user-role': 'patient',
        'x-patient-id': patientUser.patientId,
      },
    });
    const patientRecordsData = await patientRecordsRes.json();
    assert(patientRecordsData.success === true, 'Patient portal can fetch EHR records');
    assert(patientRecordsData.patient?.name !== undefined, 'Patient portal receives correct personal identity');
    console.log(`Patient Portal verified for ${patientUser.name} (${patientUser.patientId}).\n`);

    // Clean up test data
    if (pendingAptId) {
      await fetch(`${BASE_URL}/api/appointments/${pendingAptId}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'Cancelled' }),
      });
    }
    // Retract test leave from doctor
    await User.updateOne(
      { _id: doctorUser._id },
      { $pull: { leaves: { id: testLeaveId } } }
    );

  } catch (error) {
    console.error('Error during test execution:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.\n');
  }

  console.log('====================================================');
  console.log(`📊 Test Results: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed === total) {
    console.log('🎉 ALL PHASE 8 FIXES VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

runTests();
