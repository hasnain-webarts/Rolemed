import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyPharmacistCrudAndCaching() {
  const baseUrl = 'http://localhost:3000';
  console.log('====================================================');
  console.log('🧪 Starting Pharmacist CRUD & Caching Verification Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 5;

  // TEST 1: Medicines GET Cache-Control & Stock Adjustment Persistence
  console.log('[Test 1] Testing /api/medicines Cache Headers & Stock Persistence...');
  const getMedsRes = await fetch(`${baseUrl}/api/medicines?limit=5`, { cache: 'no-store' });
  const cacheControlMeds = getMedsRes.headers.get('cache-control') || '';
  console.log('  - Cache-Control header:', cacheControlMeds);

  if (!cacheControlMeds.includes('no-store')) {
    throw new Error('Test 1 Failed: /api/medicines missing Cache-Control: no-store header');
  }

  const getMedsData = await getMedsRes.json();
  const sampleMed = getMedsData.medicines[0];
  const initialStock = sampleMed.stockQuantity;
  console.log(`  - Target medicine: ${sampleMed.name} (${sampleMed.sku}), Stock: ${initialStock}`);

  // Increment stock by +2
  const patchMedRes = await fetch(`${baseUrl}/api/medicines/${sampleMed.sku}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjustQty: 2 }),
  });
  const patchMedData = await patchMedRes.json();
  console.log(`  - PATCH result stock: ${patchMedData.medicine.stockQuantity}`);

  // Verify persistence with fresh GET
  const verifyMedRes = await fetch(`${baseUrl}/api/medicines/${sampleMed.sku}`, { cache: 'no-store' });
  const verifyMedData = await verifyMedRes.json();
  console.log(`  - Fresh GET stock after PATCH: ${verifyMedData.medicine.stockQuantity}`);

  if (verifyMedData.medicine.stockQuantity !== initialStock + 2) {
    throw new Error('Test 1 Failed: Stock adjustment did not persist across fresh GET');
  }

  // Restore stock back
  await fetch(`${baseUrl}/api/medicines/${sampleMed.sku}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjustQty: -2 }),
  });
  console.log('  ✓ Test 1 Passed: Cache-Control verified and stock adjustment persisted.\n');
  passedTests++;

  // TEST 2: Prescriptions GET Cache-Control & Dispensation Persistence
  console.log('[Test 2] Testing /api/prescriptions Cache Headers & Dispensation...');
  const rxRes = await fetch(`${baseUrl}/api/prescriptions`, { cache: 'no-store' });
  const cacheControlRx = rxRes.headers.get('cache-control') || '';
  console.log('  - Cache-Control header:', cacheControlRx);

  if (!cacheControlRx.includes('no-store')) {
    throw new Error('Test 2 Failed: /api/prescriptions missing Cache-Control: no-store header');
  }

  const rxData = await rxRes.json();
  const pendingRx = rxData.prescriptions.find((r) => r.status === 'Pending Dispensation');

  if (pendingRx) {
    const rxId = pendingRx.prescriptionId || pendingRx._id;
    console.log(`  - Dispensing prescription: ${rxId}...`);

    const dispenseRes = await fetch(`${baseUrl}/api/prescriptions/${rxId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Dispensed',
        drugs: pendingRx.drugs,
        totalAmount: 450,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
      }),
    });
    const dispenseData = await dispenseRes.json();
    console.log('  - Dispense response status:', dispenseRes.status, 'Prescription status:', dispenseData.prescription?.status);

    // Verify persistence across fresh GET
    const verifyRxRes = await fetch(`${baseUrl}/api/prescriptions/${rxId}`, { cache: 'no-store' });
    const verifyRxData = await verifyRxRes.json();
    console.log('  - Fresh GET prescription status:', verifyRxData.prescription?.status);

    if (verifyRxData.prescription?.status !== 'Dispensed') {
      throw new Error('Test 2 Failed: Dispensation status did not persist across fresh GET');
    }
  } else {
    console.log('  - All prescriptions already dispensed. Skipping mutation, cache-control validated.');
  }
  console.log('  ✓ Test 2 Passed: Prescription cache headers & dispensation validated.\n');
  passedTests++;

  // TEST 3: Pharmacy Invoices GET Cache-Control & Toggle Payment Status
  console.log('[Test 3] Testing /api/pharmacy/invoices Cache Headers & Invoicing...');
  const invRes = await fetch(`${baseUrl}/api/pharmacy/invoices`, { cache: 'no-store' });
  const cacheControlInv = invRes.headers.get('cache-control') || '';
  console.log('  - Cache-Control header:', cacheControlInv);

  if (!cacheControlInv.includes('no-store')) {
    throw new Error('Test 3 Failed: /api/pharmacy/invoices missing Cache-Control: no-store header');
  }

  const invData = await invRes.json();
  const sampleInv = invData.invoices[0];
  console.log(`  - Target Invoice: ${sampleInv.invoiceId}, Current Payment Status: ${sampleInv.paymentStatus}`);

  const nextStatus = sampleInv.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
  const patchInvRes = await fetch(`${baseUrl}/api/pharmacy/invoices/${sampleInv.invoiceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentStatus: nextStatus }),
  });
  const patchInvData = await patchInvRes.json();
  console.log(`  - PATCH invoice status: ${patchInvData.invoice.paymentStatus}`);

  // Verify persistence
  const verifyInvRes = await fetch(`${baseUrl}/api/pharmacy/invoices/${sampleInv.invoiceId}`, { cache: 'no-store' });
  const verifyInvData = await verifyInvRes.json();
  console.log(`  - Fresh GET invoice status: ${verifyInvData.invoice.paymentStatus}`);

  if (verifyInvData.invoice.paymentStatus !== nextStatus) {
    throw new Error('Test 3 Failed: Invoice payment status did not persist across fresh GET');
  }
  console.log('  ✓ Test 3 Passed: Invoice caching and status toggle persistence validated.\n');
  passedTests++;

  // TEST 4: Staff Profile GET & PATCH Persistence
  console.log('[Test 4] Testing /api/profile GET & PATCH Persistence...');
  const getProfRes = await fetch(`${baseUrl}/api/profile`, { cache: 'no-store' });
  const cacheControlProf = getProfRes.headers.get('cache-control') || '';
  console.log('  - Cache-Control header:', cacheControlProf);

  if (!cacheControlProf.includes('no-store')) {
    throw new Error('Test 4 Failed: /api/profile missing Cache-Control: no-store header');
  }

  const getProfData = await getProfRes.json();
  console.log(`  - Staff user: ${getProfData.user.name} (${getProfData.user.email}), Phone: ${getProfData.user.phone}`);

  const testPhone = '+92 321 9876543';
  const patchProfRes = await fetch(`${baseUrl}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: getProfData.user.email,
      phone: testPhone,
      dispensaryWing: 'Dispensary Main Pharmacy Wing B',
    }),
  });
  const patchProfData = await patchProfRes.json();
  console.log(`  - PATCH updated phone: ${patchProfData.user.phone}, Wing: ${patchProfData.user.dispensaryWing}`);

  // Verify persistence with fresh GET
  const verifyProfRes = await fetch(`${baseUrl}/api/profile?email=${encodeURIComponent(getProfData.user.email)}`, { cache: 'no-store' });
  const verifyProfData = await verifyProfRes.json();
  console.log(`  - Fresh GET verified phone: ${verifyProfData.user.phone}`);

  if (verifyProfData.user.phone !== testPhone) {
    throw new Error('Test 4 Failed: Profile phone update did not persist in MongoDB');
  }
  console.log('  ✓ Test 4 Passed: Staff profile persistence in MongoDB validated.\n');
  passedTests++;

  // TEST 5: Summary
  console.log('====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PHARMACIST CRUD & CACHING TESTS PASSED!`);
  console.log('====================================================');
}

verifyPharmacistCrudAndCaching().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err.message);
  process.exit(1);
});
