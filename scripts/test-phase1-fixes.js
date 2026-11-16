import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import connectDB from '../db/connectDB.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Medicine from '../models/Medicine.js';
import PharmacyInvoice from '../models/PharmacyInvoice.js';
import LabInvoice from '../models/LabInvoice.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.NEXTAUTH_SECRET || '9be35f49dcf46820ff569a9b70b555ea25b42c129e92bfbe2a2818cdbe4a0b2c';

console.log('====================================================');
console.log('🧪 Starting Phase 1 Security, RBAC & Integrity Tests');
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
    // Test Group 1: Unauthenticated Requests Rejection (HTTP 401)
    // ----------------------------------------------------
    console.log('--- Test Group 1: Universal API Route Guard (401 Unauthorized) ---');

    const protectedEndpoints = [
      { url: '/api/admin/overview', method: 'GET' },
      { url: '/api/admin/staff', method: 'GET' },
      { url: '/api/admin/reports', method: 'GET' },
      { url: '/api/admin/leaves', method: 'GET' },
      { url: '/api/admin/duty-rosters', method: 'GET' },
      { url: '/api/admin/audit-logs', method: 'GET' },
      { url: '/api/patients', method: 'GET' },
      { url: '/api/appointments', method: 'GET' },
      { url: '/api/admissions', method: 'GET' },
      { url: '/api/prescriptions', method: 'GET' },
      { url: '/api/medicines', method: 'GET' },
      { url: '/api/pharmacy/invoices', method: 'GET' },
      { url: '/api/lab-orders', method: 'GET' },
      { url: '/api/lab/invoices', method: 'GET' },
      { url: '/api/queue', method: 'GET' },
      { url: '/api/doctor/schedule', method: 'GET' },
    ];

    for (const ep of protectedEndpoints) {
      const res = await fetch(`${BASE_URL}${ep.url}`, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
      });
      record(
        `Unauthenticated ${ep.method} ${ep.url} returns 401 Unauthorized`,
        res.status === 401
      );
    }

    // ----------------------------------------------------
    // Test Group 2: Role Separation / RBAC Enforcement (HTTP 403)
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Strict RBAC & Role Separation (403 Forbidden) ---');

    // Receptionist tries to access Admin Overview
    const recOverviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'receptionist',
      },
    });
    record(
      'Receptionist accessing /api/admin/overview returns 403 Forbidden',
      recOverviewRes.status === 403
    );

    // Receptionist tries to access Staff Management
    const recStaffRes = await fetch(`${BASE_URL}/api/admin/staff`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'receptionist',
      },
    });
    record(
      'Receptionist accessing /api/admin/staff returns 403 Forbidden',
      recStaffRes.status === 403
    );

    // Pharmacist tries to approve leaves
    const pharmLeaveRes = await fetch(`${BASE_URL}/api/admin/leaves`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'pharmacist',
      },
      body: JSON.stringify({ doctorId: 'dummy', leaveId: 'dummy', status: 'Approved' }),
    });
    record(
      'Pharmacist attempting PATCH /api/admin/leaves returns 403 Forbidden',
      pharmLeaveRes.status === 403
    );

    // Patient tries to create admissions
    const patientAdmitRes = await fetch(`${BASE_URL}/api/admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'patient',
      },
      body: JSON.stringify({ patientId: 'PAT-001', ward: 'General Ward A', bedNumber: 'A-101' }),
    });
    record(
      'Patient attempting POST /api/admissions returns 403 Forbidden',
      patientAdmitRes.status === 403
    );

    // Patient tries to create prescriptions
    const patientRxRes = await fetch(`${BASE_URL}/api/prescriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'patient',
      },
      body: JSON.stringify({ patientId: 'PAT-001', medicines: [] }),
    });
    record(
      'Patient attempting POST /api/prescriptions returns 403 Forbidden',
      patientRxRes.status === 403
    );

    // ----------------------------------------------------
    // Test Group 3: BOLA / Patient Data Privacy Scoping
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: BOLA / Patient Privacy Scoping ---');

    // Patient PAT-001 querying own records should succeed (200)
    const patientOwnRes = await fetch(`${BASE_URL}/api/patients/PAT-001`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'patient',
        'x-patient-id': 'PAT-001',
      },
    });
    record(
      'Patient accessing own record (PAT-001) returns 200 OK',
      patientOwnRes.status === 200
    );

    // Patient PAT-001 querying another patient's records (PAT-002) MUST be blocked (403)
    const patientOtherRes = await fetch(`${BASE_URL}/api/patients/PAT-002`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'patient',
        'x-patient-id': 'PAT-001',
      },
    });
    record(
      'Patient accessing another patient record (PAT-002) returns 403 Forbidden (BOLA Defense)',
      patientOtherRes.status === 403
    );

    // Patient querying appointment list should only receive their own records
    const patientAptRes = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'patient',
        'x-patient-id': 'PAT-001',
      },
    });
    const patientAptData = await patientAptRes.json();
    const allBelongToPatient = (patientAptData.appointments || []).every(
      (a) => a.patientId === 'PAT-001'
    );
    record(
      'Patient appointment list query is strictly scoped to own patientId',
      patientAptRes.status === 200 && allBelongToPatient
    );

    // ----------------------------------------------------
    // Test Group 4: PHI in URLs Stripped (Static Code Analysis)
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: PHI Elimination in Query Parameters ---');

    const doctorDashboardCode = fs.readFileSync(
      path.resolve(process.cwd(), 'app/dashboard/doctor/page.js'),
      'utf8'
    );
    const doctorAppointmentsCode = fs.readFileSync(
      path.resolve(process.cwd(), 'app/dashboard/doctor/appointments/page.js'),
      'utf8'
    );

    const hasReasonQuery = doctorDashboardCode.includes('reason=') || doctorAppointmentsCode.includes('reason=');
    const hasNameQuery = doctorDashboardCode.includes('&name=') || doctorAppointmentsCode.includes('&name=');
    const hasAgeQuery = doctorDashboardCode.includes('age=') || doctorAppointmentsCode.includes('age=');

    record(
      'Doctor dashboard links contain NO clinical reason query parameter',
      !hasReasonQuery
    );
    record(
      'Doctor dashboard links contain NO patient name query parameter',
      !hasNameQuery
    );
    record(
      'Doctor dashboard links contain NO patient age/gender query parameter',
      !hasAgeQuery
    );

    // ----------------------------------------------------
    // Test Group 5: Dynamic Clinician Identity Attribution
    // ----------------------------------------------------
    console.log('\n--- Test Group 5: Dynamic Clinician Attribution ---');

    const testDoctorUser = {
      name: 'Dr. Test Attributor',
      role: 'doctor',
    };

    // Pharmacy Invoice attribution
    const phmInvRes = await fetch(`${BASE_URL}/api/pharmacy/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'pharmacist',
        'x-user-name': 'PharmD Test User',
      },
      body: JSON.stringify({
        patientName: 'Test Patient',
        items: [{ name: 'Test Paracetamol', qtyUnits: 1, totalPrice: 100 }],
        paymentStatus: 'Paid',
      }),
    });
    const phmInvData = await phmInvRes.json();
    record(
      'Pharmacy invoice dynamically records authenticated pharmacist name',
      phmInvData.invoice?.dispensedBy === 'PharmD Test User'
    );

    // Lab Invoice attribution
    const labInvRes = await fetch(`${BASE_URL}/api/lab/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': SECRET,
        'x-user-role': 'lab-technician',
        'x-user-name': 'Technologist Test User',
      },
      body: JSON.stringify({
        patientName: 'Test Patient',
        tests: [{ testName: 'Test CBC', price: 500 }],
        paymentStatus: 'Paid',
      }),
    });
    const labInvData = await labInvRes.json();
    record(
      'Lab invoice dynamically records authenticated lab technician name',
      labInvData.invoice?.billedBy?.includes('Technologist Test User')
    );

    // Clean up created test invoices
    if (phmInvData.invoice?._id) {
      await PharmacyInvoice.deleteOne({ _id: phmInvData.invoice._id });
    }
    if (labInvData.invoice?._id) {
      await LabInvoice.deleteOne({ _id: labInvData.invoice._id });
    }

    // Verify Schema default values no longer contain hardcoded individuals
    const phmDefault = PharmacyInvoice.schema.path('dispensedBy').defaultValue;
    const labDefault = LabInvoice.schema.path('billedBy').defaultValue;
    record(
      'PharmacyInvoice schema default does not contain "David Miller"',
      !String(phmDefault).includes('David Miller')
    );
    record(
      'LabInvoice schema default does not contain "Elena Rostova"',
      !String(labDefault).includes('Elena Rostova')
    );

    // ----------------------------------------------------
    // Test Group 6: Production HTTP Security Headers Configuration
    // ----------------------------------------------------
    console.log('\n--- Test Group 6: HTTP Security Headers in next.config.mjs ---');

    const nextConfigContent = fs.readFileSync(
      path.resolve(process.cwd(), 'next.config.mjs'),
      'utf8'
    );
    record(
      'next.config.mjs configures Strict-Transport-Security header',
      nextConfigContent.includes('Strict-Transport-Security')
    );
    record(
      'next.config.mjs configures X-Frame-Options: DENY header',
      nextConfigContent.includes('X-Frame-Options') && nextConfigContent.includes('DENY')
    );
    record(
      'next.config.mjs configures X-Content-Type-Options: nosniff header',
      nextConfigContent.includes('X-Content-Type-Options') && nextConfigContent.includes('nosniff')
    );
    record(
      'next.config.mjs configures Referrer-Policy header',
      nextConfigContent.includes('Referrer-Policy')
    );
    record(
      'next.config.mjs configures Permissions-Policy header',
      nextConfigContent.includes('Permissions-Policy')
    );

  } catch (err) {
    console.error('Fatal error during Phase 1 test execution:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n====================================================');
    console.log(`🏁 Phase 1 Test Execution Complete: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
    console.log('====================================================');
    process.exit(passed === total ? 0 : 1);
  }
}

runTests();

