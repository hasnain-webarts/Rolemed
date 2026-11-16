import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../db/connectDB.js';
import User from '../models/User.js';
import Admission from '../models/Admission.js';
import Appointment from '../models/Appointment.js';
import { escapeRegex } from '../lib/escapeRegex.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.NEXTAUTH_SECRET || '9be35f49dcf46820ff569a9b70b555ea25b42c129e92bfbe2a2818cdbe4a0b2c';

const adminHeaders = {
  'Content-Type': 'application/json',
  'x-internal-key': SECRET,
  'x-user-role': 'admin',
};

console.log('====================================================');
console.log('🧪 Starting Phase 0 Containment & Safety Verification');
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

  // ----------------------------------------------------
  // Test 1: escapeRegex sanitizes dangerous metacharacters
  // ----------------------------------------------------
  console.log('--- Test Group 1: ReDoS & Regex Sanitization ---');
  const dangerousStr = '((([[[***+++?^${}|\\';
  const escaped = escapeRegex(dangerousStr);
  let regexCreated = false;
  try {
    const reg = new RegExp(escaped, 'i');
    regexCreated = reg instanceof RegExp;
  } catch {
    regexCreated = false;
  }
  record('escapeRegex safely handles complex metacharacters without throwing', regexCreated);
  record('escapeRegex returns empty string for null or non-strings', escapeRegex(null) === '' && escapeRegex(undefined) === '');

  // Connect DB for direct state assertions
  await connectDB();

  try {
    // ----------------------------------------------------
    // Test 2: POST /api/auth/register rejects unauthenticated registration
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Public Registration Decommissioning ---');
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker Admin',
        email: 'attacker@hospital.test',
        password: 'password123',
        role: 'admin',
      }),
    });
    const regBody = await regRes.json();
    record(
      'POST /api/auth/register returns 403 Forbidden when unauthenticated',
      regRes.status === 403 && regBody.error?.includes('Public registration is disabled')
    );

    const attackerUser = await User.findOne({ email: 'attacker@hospital.test' });
    record('Zero rogue administrator records created in MongoDB', attackerUser === null);

    // ----------------------------------------------------
    // Test 3: /signup redirects to /login
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: Public /signup Redirect ---');
    const signupRes = await fetch(`${BASE_URL}/signup`, {
      redirect: 'manual',
    });
    record(
      'GET /signup responds with redirect status (307/308/302)',
      signupRes.status === 307 || signupRes.status === 308 || signupRes.status === 302
    );
    const location = signupRes.headers.get('location') || '';
    record('GET /signup redirects location to /login', location.includes('/login'));

    // ----------------------------------------------------
    // Test 4: /api/profile rejects unauthenticated access & modification
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Profile Fallback Selector Elimination ---');
    const profileGetRes = await fetch(`${BASE_URL}/api/profile?role=admin`, {
      method: 'GET',
    });
    record(
      'GET /api/profile?role=admin returns 401 Unauthorized without session',
      profileGetRes.status === 401
    );

    const profilePatchRes = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'admin',
        bio: 'Hacked bio text',
      }),
    });
    record(
      'PATCH /api/profile returns 401 Unauthorized without session',
      profilePatchRes.status === 401
    );

    // ----------------------------------------------------
    // Test 5: POST /api/admin/audit-logs rejects unauthenticated forgery
    // ----------------------------------------------------
    console.log('\n--- Test Group 5: Audit Log Forgery Protection ---');
    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE',
        module: 'Security',
        description: 'Forged audit log from anonymous client',
        user: 'Fake Admin',
      }),
    });
    record(
      'POST /api/admin/audit-logs returns 401 Unauthorized without session',
      auditRes.status === 401
    );

    // ----------------------------------------------------
    // Test 6: Mass Assignment Protection on Admissions
    // ----------------------------------------------------
    console.log('\n--- Test Group 6: Mass Assignment Elimination (Admissions) ---');
    let testAdm = await Admission.findOne({ status: 'Admitted' });
    if (!testAdm) {
      testAdm = await Admission.create({
        admissionId: 'ADM-TEST-001',
        patientId: 'PAT-TEST-001',
        patientName: 'Test Patient',
        ward: 'General Ward A',
        bedNumber: 'A-999',
        doctorName: 'Dr. Sarah Jenkins',
        admittingDiagnosis: 'Fever for Observation',
        status: 'Admitted',
      });
    }

    const originalAdmissionId = testAdm.admissionId;
    const originalPatientId = testAdm.patientId;

    const admPatchRes = await fetch(`${BASE_URL}/api/admissions/${testAdm.admissionId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        admissionId: 'ADM-HACKED-999', // Disallowed field!
        patientId: 'PAT-HIJACKED-999',  // Disallowed field!
        notes: 'Clinical notes safely updated during phase 0 test', // Allowed field
      }),
    });
    const admPatchBody = await admPatchRes.json();

    const refreshedAdm = await Admission.findById(testAdm._id).lean();
    record(
      'Allowed notes field was updated successfully',
      admPatchBody.success === true && refreshedAdm.notes === 'Clinical notes safely updated during phase 0 test'
    );
    record(
      'Immutable admissionId was protected from mass assignment',
      refreshedAdm.admissionId === originalAdmissionId && refreshedAdm.admissionId !== 'ADM-HACKED-999'
    );
    record(
      'Immutable patientId was protected from mass assignment',
      refreshedAdm.patientId === originalPatientId && refreshedAdm.patientId !== 'PAT-HIJACKED-999'
    );

    // ----------------------------------------------------
    // Test 7: Mass Assignment Protection on Appointments
    // ----------------------------------------------------
    console.log('\n--- Test Group 7: Mass Assignment Elimination (Appointments) ---');
    let testApt = await Appointment.findOne({ status: 'Scheduled' });
    if (!testApt) {
      testApt = await Appointment.create({
        appointmentId: 'APT-TEST-001',
        patientId: 'PAT-TEST-001',
        patientName: 'Test Patient',
        doctorName: 'Dr. Sarah Jenkins',
        date: '2026-12-01',
        reason: 'Routine Followup',
        status: 'Scheduled',
      });
    }

    const originalAptId = testApt.appointmentId;
    const originalAptPatientId = testApt.patientId;

    const aptPatchRes = await fetch(`${BASE_URL}/api/appointments/${testApt.appointmentId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        appointmentId: 'APT-HACKED-999', // Disallowed field!
        patientId: 'PAT-HIJACKED-999',  // Disallowed field!
        notes: 'Appointment notes safely updated during phase 0 test', // Allowed field
      }),
    });
    const aptPatchBody = await aptPatchRes.json();

    const refreshedApt = await Appointment.findById(testApt._id).lean();
    record(
      'Allowed appointment notes field was updated successfully',
      aptPatchBody.success === true && refreshedApt.notes === 'Appointment notes safely updated during phase 0 test'
    );
    record(
      'Immutable appointmentId was protected from mass assignment',
      refreshedApt.appointmentId === originalAptId && refreshedApt.appointmentId !== 'APT-HACKED-999'
    );
    record(
      'Immutable appointment patientId was protected from mass assignment',
      refreshedApt.patientId === originalAptPatientId && refreshedApt.patientId !== 'PAT-HIJACKED-999'
    );

    // ----------------------------------------------------
    // Test 8: ReDoS Query Safety on Search Endpoints
    // ----------------------------------------------------
    console.log('\n--- Test Group 8: ReDoS Query Safety Across Endpoints ---');
    const complexQuery = encodeURIComponent('((([[[***+++?^${}|\\');
    const [admSearchRes, rxSearchRes, conSearchRes] = await Promise.all([
      fetch(`${BASE_URL}/api/admissions?search=${complexQuery}`, { headers: adminHeaders }),
      fetch(`${BASE_URL}/api/prescriptions?search=${complexQuery}`, { headers: adminHeaders }),
      fetch(`${BASE_URL}/api/consultations?search=${complexQuery}`, { headers: adminHeaders }),
    ]);

    record('Admissions search survives complex regex metacharacters without 500 crash', admSearchRes.status === 200);
    record('Prescriptions search survives complex regex metacharacters without 500 crash', rxSearchRes.status === 200);
    record('Consultations search survives complex regex metacharacters without 500 crash', conSearchRes.status === 200);

  } finally {
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`📊 Phase 0 Test Results: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  assert.strictEqual(passed, total, 'All Phase 0 tests must pass!');
}

runTests().catch((err) => {
  console.error('Phase 0 Verification Error:', err);
  process.exit(1);
});
