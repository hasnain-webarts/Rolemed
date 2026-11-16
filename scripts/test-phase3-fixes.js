import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

async function runPhase3Tests() {
  console.log('\n======================================================');
  console.log('RoleMed RB-HMS Phase 3 Verification Suite');
  console.log('Observability, Aggregations, Error Boundaries & Reliability');
  console.log('======================================================\n');

  // Test 1: Service Healthcheck Endpoint (RM-OPS-005)
  console.log('--- Test 1: Operational Healthcheck Probe (/api/health) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.status === 200, 'GET /api/health returns HTTP 200');
    const data = await res.json();
    assert(data.status === 'healthy', 'Health status is "healthy"', JSON.stringify(data));
    assert(data.database && data.database.status === 'connected', 'Database status reports "connected"');
    assert(typeof data.uptimeSeconds === 'number' && data.uptimeSeconds >= 0, 'Uptime reported in seconds');
    assert(data.system && typeof data.system.heapUsedMB === 'number', 'Memory usage reported in MB');
  } catch (err) {
    assert(false, 'Healthcheck endpoint responds', err.message);
  }

  // Test 2: Connection Pooling & Graceful Shutdown in db/connectDB.js (RM-OPS-002, RM-OPS-007)
  console.log('\n--- Test 2: Connection Pooling & Process Signal Handlers ---');
  try {
    const connectDbPath = path.resolve(process.cwd(), 'db/connectDB.js');
    const connectDbCode = fs.readFileSync(connectDbPath, 'utf8');
    assert(connectDbCode.includes('maxPoolSize: 10'), 'connectDB specifies maxPoolSize: 10');
    assert(connectDbCode.includes('minPoolSize: 2'), 'connectDB specifies minPoolSize: 2');
    assert(connectDbCode.includes('serverSelectionTimeoutMS: 5000'), 'connectDB specifies serverSelectionTimeoutMS: 5000');
    assert(connectDbCode.includes('SIGINT') && connectDbCode.includes('SIGTERM'), 'Graceful shutdown handlers bound to SIGINT & SIGTERM');
  } catch (err) {
    assert(false, 'Connection pool verification', err.message);
  }

  // Test 3: React Error Boundaries (RM-FE-001)
  console.log('\n--- Test 3: React Error Boundaries (app/error.js & app/dashboard/error.js) ---');
  try {
    const rootErrorPath = path.resolve(process.cwd(), 'app/error.js');
    const dashErrorPath = path.resolve(process.cwd(), 'app/dashboard/error.js');
    
    assert(fs.existsSync(rootErrorPath), 'Root error boundary app/error.js exists');
    assert(fs.existsSync(dashErrorPath), 'Dashboard error boundary app/dashboard/error.js exists');

    const rootCode = fs.readFileSync(rootErrorPath, 'utf8');
    const dashCode = fs.readFileSync(dashErrorPath, 'utf8');

    assert(rootCode.includes('use client') && rootCode.includes('reset'), 'app/error.js is client component with reset handler');
    assert(dashCode.includes('use client') && dashCode.includes('reset'), 'app/dashboard/error.js is client component with reset handler');
  } catch (err) {
    assert(false, 'Error boundaries verification', err.message);
  }

  // Test 4: Native Aggregations in Admin Overview (RM-PERF-001, RM-OPS-001)
  console.log('\n--- Test 4: Aggregation Pipeline in Admin Overview (/api/admin/overview) ---');
  try {
    const adminHeaders = {
      'x-internal-key': INTERNAL_SECRET,
      'x-user-role': 'admin',
      'x-user-id': 'admin-test-service',
    };

    const startTime = Date.now();
    const res = await fetch(`${BASE_URL}/api/admin/overview`, { headers: adminHeaders });
    const duration = Date.now() - startTime;

    assert(res.status === 200, 'GET /api/admin/overview returns HTTP 200');
    const data = await res.json();
    assert(data.success === true, 'Overview response reports success: true');
    assert(data.currency === 'PKR', 'Overview currency strictly set to PKR');
    assert(typeof data.metrics?.admittedPatients === 'number', 'Metrics contain aggregated admittedPatients');
    assert(typeof data.metrics?.bedOccupancyRate === 'number', 'Metrics contain calculated bedOccupancyRate');
    assert(typeof data.financials?.totalHospitalRevenue === 'number', 'Financials contain calculated totalHospitalRevenue in PKR');
    assert(duration < 1000, `Overview responded in ${duration}ms (target: < 1000ms)`);
  } catch (err) {
    assert(false, 'Overview aggregation verification', err.message);
  }

  // Test 5: Native Aggregations in Admin Reports (/api/admin/reports)
  console.log('\n--- Test 5: Aggregation Pipeline in Admin Reports (/api/admin/reports) ---');
  try {
    const adminHeaders = {
      'x-internal-key': INTERNAL_SECRET,
      'x-user-role': 'admin',
      'x-user-id': 'admin-test-service',
    };

    const startTime = Date.now();
    const res = await fetch(`${BASE_URL}/api/admin/reports`, { headers: adminHeaders });
    const duration = Date.now() - startTime;

    assert(res.status === 200, 'GET /api/admin/reports returns HTTP 200');
    const data = await res.json();
    assert(data.success === true, 'Reports response reports success: true');
    assert(data.currency === 'PKR', 'Reports currency strictly set to PKR');
    assert(data.summary && typeof data.summary.totalHospitalRevenue === 'number', 'Summary contains totalHospitalRevenue aggregated from invoices');
    assert(Array.isArray(data.departmentPerformance), 'Department performance generated as array');
    assert(duration < 1000, `Reports responded in ${duration}ms (target: < 1000ms)`);
  } catch (err) {
    assert(false, 'Reports aggregation verification', err.message);
  }

  // Summary
  console.log('\n======================================================');
  console.log(`Phase 3 Test Results: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase3Tests();
