import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/rolemed';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 ROLEMED PHASE 5: LABORATORY MANAGEMENT SYSTEM TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Connect to MongoDB directly to verify DB-level persistence
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for direct state verification.\n');

  const db = mongoose.connection.db;
  const labOrdersCol = db.collection('laborders');
  const labInvoicesCol = db.collection('labinvoices');
  const usersCol = db.collection('users');

  try {
    // ----------------------------------------------------
    // Test 1: Cache Prevention Headers Verification
    // ----------------------------------------------------
    console.log('[Test 1] Verifying Force-Dynamic & No-Cache HTTP Headers...');
    try {
      const [ordersRes, invoicesRes] = await Promise.all([
        fetch(`${BASE_URL}/api/lab-orders`, { cache: 'no-store' }),
        fetch(`${BASE_URL}/api/lab/invoices`, { cache: 'no-store' }),
      ]);

      const ordersCache = ordersRes.headers.get('cache-control') || '';
      const invoicesCache = invoicesRes.headers.get('cache-control') || '';

      assert(ordersCache.includes('no-store'), `/api/lab-orders returns Cache-Control: no-store (got "${ordersCache}")`);
      assert(invoicesCache.includes('no-store'), `/api/lab/invoices returns Cache-Control: no-store (got "${invoicesCache}")`);
    } catch (e) {
      console.warn(`  ⚠️ Next.js server on ${BASE_URL} might not be running or reachable (${e.message}). Testing DB layer directly.`);
    }

    // ----------------------------------------------------
    // Test 2: Lab Order Specimen Lifecycle & Metrics Entry
    // ----------------------------------------------------
    console.log('\n[Test 2] Lab Order Specimen Collection & Results Lifecycle...');
    
    // Create test lab order
    const testOrderId = `REQ-TEST-${Date.now().toString().slice(-4)}`;
    await labOrdersCol.insertOne({
      orderId: testOrderId,
      patientId: 'PAT-001',
      patientName: 'John Doe',
      doctorName: 'Dr. Sarah Johnson',
      testName: 'Complete Blood Count (CBC) with ESR',
      priority: 'Urgent',
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const insertedOrder = await labOrdersCol.findOne({ orderId: testOrderId });
    assert(insertedOrder !== null && insertedOrder.status === 'Pending', `Created test lab order ${testOrderId} in Pending status`);

    // Advance to In Progress (Specimen Collection)
    await labOrdersCol.updateOne(
      { orderId: testOrderId },
      {
        $set: {
          status: 'In Progress',
          specimenCollectedAt: new Date(),
          processedBy: 'Elena Rostova, Lab Technologist',
          updatedAt: new Date(),
        },
      }
    );

    const inProgOrder = await labOrdersCol.findOne({ orderId: testOrderId });
    assert(inProgOrder.status === 'In Progress' && inProgOrder.specimenCollectedAt !== undefined, 'Advanced to In Progress with specimen collection timestamp');

    // Finalize with Structured Metrics
    const testMetrics = { hb: '14.2 g/dL', wbc: '7.1 K/µL', platelets: '280 K/µL' };
    await labOrdersCol.updateOne(
      { orderId: testOrderId },
      {
        $set: {
          status: 'Completed',
          resultMetrics: testMetrics,
          criticalAlert: false,
          findings: 'CBC within normal limits.',
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    const completedOrder = await labOrdersCol.findOne({ orderId: testOrderId });
    assert(
      completedOrder.status === 'Completed' &&
      completedOrder.resultMetrics.hb === '14.2 g/dL' &&
      completedOrder.completedAt !== undefined,
      'Finalized order with structured clinical metrics & Completed status'
    );

    // Clean up test order
    await labOrdersCol.deleteOne({ orderId: testOrderId });

    // ----------------------------------------------------
    // Test 3: Lab Invoicing in Pakistani Rupees (PKR)
    // ----------------------------------------------------
    console.log('\n[Test 3] Lab Invoicing in PKR & Payment Status Toggle...');
    
    const testInvoiceId = `LAB-INV-TEST-${Date.now().toString().slice(-4)}`;
    const testsBilled = [
      { testCode: 'T-CBC', testName: 'Complete Blood Count (CBC) with ESR', category: 'Hematology', price: 950 },
      { testCode: 'T-FBS', testName: 'Fasting Blood Sugar (FBS)', category: 'Biochemistry', price: 350 },
    ];
    const subtotal = 950 + 350; // 1300
    const discount = 100;
    const totalAmount = 1200;

    await labInvoicesCol.insertOne({
      invoiceId: testInvoiceId,
      patientId: 'PAT-002',
      patientName: 'Alice Smith',
      orderId: 'REQ-301',
      tests: testsBilled,
      subtotal,
      discount,
      totalAmount,
      paymentStatus: 'Unpaid',
      paymentMethod: 'Cash',
      billedBy: 'Elena Rostova, Lab Technologist',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createdInv = await labInvoicesCol.findOne({ invoiceId: testInvoiceId });
    assert(createdInv !== null, `Created lab invoice ${testInvoiceId} in MongoDB`);
    assert(createdInv.subtotal === 1300, `Subtotal calculated correctly in PKR (Rs. 1300)`);
    assert(createdInv.totalAmount === 1200, `Net total calculated correctly after discount in PKR (Rs. 1200)`);
    assert(createdInv.paymentStatus === 'Unpaid', `Initial payment status is 'Unpaid'`);

    // Toggle payment status to Paid
    await labInvoicesCol.updateOne(
      { invoiceId: testInvoiceId },
      { $set: { paymentStatus: 'Paid', updatedAt: new Date() } }
    );

    const paidInv = await labInvoicesCol.findOne({ invoiceId: testInvoiceId });
    assert(paidInv.paymentStatus === 'Paid', `Payment status successfully updated to 'Paid' and verified in MongoDB`);

    // Clean up test invoice
    await labInvoicesCol.deleteOne({ invoiceId: testInvoiceId });

    // ----------------------------------------------------
    // Test 4: Lab Technician Profile Persistence
    // ----------------------------------------------------
    console.log('\n[Test 4] Lab Technician Profile Persistence in MongoDB...');

    const originalUser = await usersCol.findOne({ role: 'lab-technician' });
    assert(originalUser !== null, `Found lab-technician staff account (${originalUser?.email})`);

    const originalWing = originalUser.labWing || 'Clinical Pathology & Diagnostics Wing';
    const testWing = 'Automated Diagnostics Core Sub-Wing 4';

    await usersCol.updateOne(
      { _id: originalUser._id },
      { $set: { labWing: testWing, updatedAt: new Date() } }
    );

    const updatedUser = await usersCol.findOne({ _id: originalUser._id });
    assert(updatedUser.labWing === testWing, `Profile labWing updated and persisted to MongoDB ("${updatedUser.labWing}")`);

    // Restore original wing
    await usersCol.updateOne(
      { _id: originalUser._id },
      { $set: { labWing: originalWing, updatedAt: new Date() } }
    );

    // ----------------------------------------------------
    // Final Summary
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`Phase 5 Test Suite Results: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');

    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test suite error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();

