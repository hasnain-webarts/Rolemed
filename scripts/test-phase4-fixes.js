import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../db/connectDB.js';
import Counter from '../models/Counter.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const INTERNAL_SECRET = process.env.NEXTAUTH_SECRET || '9be35f49dcf46820ff569a9b70b555ea25b42c129e92bfbe2a2818cdbe4a0b2c';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    failedCount++;
  }
}

async function runPhase4Tests() {
  console.log('\n======================================================');
  console.log('RoleMed RB-HMS Phase 4 Verification Suite');
  console.log('Indexes, DevOps, Clean Config, A11y, Modals & Pagination');
  console.log('======================================================\n');

  // Test 1: High-Frequency Database Compound Indexes (RM-DATA-005)
  console.log('--- Test 1: Compound Database Indexes ---');
  try {
    const aptCode = fs.readFileSync(path.resolve(process.cwd(), 'models/Appointment.js'), 'utf8');
    const admCode = fs.readFileSync(path.resolve(process.cwd(), 'models/Admission.js'), 'utf8');
    const auditCode = fs.readFileSync(path.resolve(process.cwd(), 'models/AuditLog.js'), 'utf8');

    assert(aptCode.includes('doctorId: 1, date: 1, status: 1'), 'Appointment defines { doctorId, date, status } index');
    assert(aptCode.includes('patientId: 1, createdAt: -1'), 'Appointment defines { patientId, createdAt } index');
    assert(admCode.includes('ward: 1, bedNumber: 1, status: 1'), 'Admission defines { ward, bedNumber, status } index');
    assert(admCode.includes('patientId: 1, status: 1'), 'Admission defines { patientId, status } index');
    assert(auditCode.includes('module: 1, timestamp: -1'), 'AuditLog defines { module, timestamp } index');
    assert(auditCode.includes('alert: 1, timestamp: -1'), 'AuditLog defines { alert, timestamp } index');
  } catch (err) {
    assert(false, 'Database indexes verification', err.message);
  }

  // Test 2: Production Multi-Stage Dockerfile & compose (RM-OPS-008)
  console.log('\n--- Test 2: Multi-Stage Docker & Compose Packaging ---');
  try {
    const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile');
    const composePath = path.resolve(process.cwd(), 'docker-compose.yml');

    assert(fs.existsSync(dockerfilePath), 'Dockerfile exists');
    assert(fs.existsSync(composePath), 'docker-compose.yml exists');

    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    assert(dockerfile.includes('FROM base AS deps') && dockerfile.includes('FROM base AS builder') && dockerfile.includes('FROM base AS runner'), 'Dockerfile implements multi-stage build (deps, builder, runner)');
    assert(dockerfile.includes('USER nextjs'), 'Dockerfile runs under unprivileged nextjs user');
    assert(dockerfile.includes('HEALTHCHECK'), 'Dockerfile includes container healthcheck probe');

    const compose = fs.readFileSync(composePath, 'utf8');
    assert(compose.includes('container_name: rolemed-hms-app') && compose.includes('container_name: rolemed-hms-mongodb'), 'docker-compose defines both application and mongodb services');
  } catch (err) {
    assert(false, 'Docker packaging verification', err.message);
  }

  // Test 3: Legacy Dead Code Cleanup & Environment Template (RM-CODE-001, RM-CONFIG-001)
  console.log('\n--- Test 3: Dead Code Cleanup & Environment Template ---');
  try {
    const mockDataPath = path.resolve(process.cwd(), 'lib/mockData.js');
    const envExamplePath = path.resolve(process.cwd(), '.env.example');

    assert(!fs.existsSync(mockDataPath), 'Legacy lib/mockData.js is eliminated from codebase');
    assert(fs.existsSync(envExamplePath), '.env.example template file is present');

    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    assert(envExample.includes('NEXTAUTH_SECRET') && envExample.includes('MONGO_URI'), '.env.example documents essential keys');
  } catch (err) {
    assert(false, 'Code cleanup & config verification', err.message);
  }

  // Test 4: Accessible Confirmation Modals (RM-FE-A11Y-001, RM-FE-UX-001)
  console.log('\n--- Test 4: Accessible Confirmation Modals & Focus Management ---');
  try {
    const confirmModalPath = path.resolve(process.cwd(), 'components/ConfirmationModal.js');
    assert(fs.existsSync(confirmModalPath), 'ConfirmationModal component exists');

    const modalCode = fs.readFileSync(confirmModalPath, 'utf8');
    assert(modalCode.includes('role="alertdialog"') && modalCode.includes('aria-modal="true"'), 'ConfirmationModal implements alertdialog role and aria-modal');
    assert(modalCode.includes("e.key === 'Escape'"), 'ConfirmationModal handles Escape-key dismissal');

    const timeoutCode = fs.readFileSync(path.resolve(process.cwd(), 'components/SessionTimeoutModal.js'), 'utf8');
    assert(timeoutCode.includes('role="alertdialog"') && timeoutCode.includes("e.key === 'Escape'"), 'SessionTimeoutModal implements alertdialog and Escape dismissal');

    const admPageCode = fs.readFileSync(path.resolve(process.cwd(), 'app/dashboard/receptionist/admissions/page.js'), 'utf8');
    assert(admPageCode.includes('<ConfirmationModal') && !admPageCode.includes('if (!confirm('), 'Receptionist admissions uses in-app ConfirmationModal without window.confirm()');

    const aptPageCode = fs.readFileSync(path.resolve(process.cwd(), 'app/dashboard/receptionist/appointments/page.js'), 'utf8');
    assert(aptPageCode.includes('<ConfirmationModal') && !aptPageCode.includes('if (!confirm('), 'Receptionist appointments uses in-app ConfirmationModal without window.confirm()');
  } catch (err) {
    assert(false, 'Modal accessibility verification', err.message);
  }

  // Test 5: Standardized Pagination Metadata (RM-API-011)
  console.log('\n--- Test 5: Standardized Pagination Metadata ---');
  try {
    const adminHeaders = {
      'x-internal-key': INTERNAL_SECRET,
      'x-user-role': 'admin',
      'x-user-id': 'admin-test-service',
    };

    const patRes = await fetch(`${BASE_URL}/api/patients?page=1&limit=3`, { headers: adminHeaders });
    assert(patRes.status === 200, 'GET /api/patients returns HTTP 200');
    const patData = await patRes.json();
    assert(patData.pagination && typeof patData.pagination.totalPages === 'number', 'Patients response includes standard pagination metadata');
    assert(patData.pagination.page === 1 && patData.pagination.limit === 3, 'Pagination respects requested page=1 and limit=3');

    const aptRes = await fetch(`${BASE_URL}/api/appointments?page=1&limit=3`, { headers: adminHeaders });
    assert(aptRes.status === 200, 'GET /api/appointments returns HTTP 200');
    const aptData = await aptRes.json();
    assert(aptData.pagination && typeof aptData.pagination.totalPages === 'number', 'Appointments response includes standard pagination metadata');
    assert(aptData.pagination.page === 1 && aptData.pagination.limit === 3, 'Appointments pagination respects requested page and limit');
  } catch (err) {
    assert(false, 'Pagination verification', err.message);
  }

  // Test 6: Atomic Monotonic Sequence Counter (RM-DATA-003)
  console.log('\n--- Test 6: Atomic Sequence Counter Model ---');
  try {
    await connectDB();
    const id1 = await Counter.getNextSequence('test_collision_unit', { prefix: 'UNIT-', padLength: 4, seedFloor: 100 });
    const id2 = await Counter.getNextSequence('test_collision_unit', { prefix: 'UNIT-', padLength: 4, seedFloor: 100 });
    
    assert(id1 === 'UNIT-0100', `Initial sequence respects seed floor: ${id1}`);
    assert(id2 === 'UNIT-0101', `Subsequent sequence increments monotonically: ${id2}`);

    // Cleanup test sequence
    await Counter.deleteOne({ _id: 'test_collision_unit' });
    await mongoose.disconnect();
  } catch (err) {
    assert(false, 'Counter model verification', err.message);
  }

  // Summary
  console.log('\n======================================================');
  console.log(`Phase 4 Test Results: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase4Tests();
