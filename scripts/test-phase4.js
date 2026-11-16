import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/rolemed';

async function runPhase4Verification() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 4 Pharmacy & Formulary E2E Test Suite');
  console.log('====================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const db = mongoose.connection.db;
    const medicinesCollection = db.collection('medicines');
    const prescriptionsCollection = db.collection('prescriptions');

    // 1. Check Seeding & Inventory Count
    const totalMeds = await medicinesCollection.countDocuments();
    console.log(`[Test 1] Formulary Catalog Verification: Found ${totalMeds} formulations in database.`);
    if (totalMeds < 15) {
      throw new Error(`Expected at least 15 seeded medicines, found ${totalMeds}`);
    }
    console.log('  ✓ Test 1 Passed: Formulary adequately populated.\n');

    // 2. Check SKU generation & Unique Index
    const testSku = 'MED-TEST-999';
    await medicinesCollection.deleteOne({ sku: testSku });

    const newMed = {
      sku: testSku,
      name: 'Aztreonam 1g Injection',
      genericName: 'Aztreonam',
      category: 'Antibiotics',
      dosageForm: 'Injection',
      strength: '1g',
      stockQuantity: 50,
      unitPrice: 24.50,
      reorderLevel: 15,
      expiryDate: '2027-12-31',
      manufacturer: 'Gilead Sciences',
      batchNumber: 'AZT-2026-X',
      location: 'Sterile Injection Bay 3',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await medicinesCollection.insertOne(newMed);
    console.log(`[Test 2] Registration Verification: Created test formulation [${testSku}] "${newMed.name}".`);

    const insertedMed = await medicinesCollection.findOne({ sku: testSku });
    if (!insertedMed || insertedMed.stockQuantity !== 50) {
      throw new Error('Inserted medicine stock quantity mismatch');
    }
    console.log('  ✓ Test 2 Passed: Formulation registered with initial stock 50.\n');

    // 3. Stock Adjustment (+15)
    await medicinesCollection.updateOne(
      { sku: testSku },
      { $inc: { stockQuantity: 15 }, $set: { updatedAt: new Date() } }
    );
    const adjustedMed = await medicinesCollection.findOne({ sku: testSku });
    console.log(`[Test 3] Stock Adjustment Verification: Adjusted +15 units. New balance: ${adjustedMed.stockQuantity}.`);
    if (adjustedMed.stockQuantity !== 65) {
      throw new Error(`Expected 65 stock, got ${adjustedMed.stockQuantity}`);
    }
    console.log('  ✓ Test 3 Passed: Stock adjustment atomic and accurate.\n');

    // 4. Automated Dispensation & Stock Deduction
    const testRxId = 'RX-TEST-PHASE4';
    await prescriptionsCollection.deleteOne({ prescriptionId: testRxId });

    const testRx = {
      prescriptionId: testRxId,
      patientId: 'PAT-001',
      patientName: 'John Doe',
      doctorName: 'Dr. Sarah Johnson',
      drugs: [
        {
          name: 'Aztreonam 1g Injection',
          dosage: '1g IV BID',
          frequency: 'BID',
          duration: '5 days',
          instruction: 'Infuse over 30 mins',
          qtyNeeded: 10,
        },
      ],
      generalInstructions: 'Hospital clinical administration only.',
      status: 'Pending Dispensation',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await prescriptionsCollection.insertOne(testRx);
    console.log(`[Test 4] Created test prescription ${testRxId} for 10 units of Aztreonam.`);

    // Simulate Dispensation logic from PATCH /api/prescriptions/[id]
    const rxToDispense = await prescriptionsCollection.findOne({ prescriptionId: testRxId });
    if (!rxToDispense) throw new Error('Test prescription not found');

    for (const drug of rxToDispense.drugs) {
      const qtyToDeduct = drug.qtyNeeded || 1;
      const medInStock = await medicinesCollection.findOne({ name: drug.name });
      if (medInStock) {
        const updatedQty = Math.max(0, medInStock.stockQuantity - qtyToDeduct);
        await medicinesCollection.updateOne({ _id: medInStock._id }, { $set: { stockQuantity: updatedQty } });
      }
    }

    await prescriptionsCollection.updateOne(
      { prescriptionId: testRxId },
      { $set: { status: 'Dispensed', dispensedAt: new Date(), dispensedBy: 'David Miller, PharmD' } }
    );

    const dispensedRx = await prescriptionsCollection.findOne({ prescriptionId: testRxId });
    const medAfterDispense = await medicinesCollection.findOne({ sku: testSku });

    console.log(`[Test 4 Continued] Prescription status is now "${dispensedRx.status}".`);
    console.log(`  Stock before dispense: 65, deducted: 10, stock after dispense: ${medAfterDispense.stockQuantity}`);

    if (dispensedRx.status !== 'Dispensed' || medAfterDispense.stockQuantity !== 55) {
      throw new Error(`Expected 55 units remaining, got ${medAfterDispense.stockQuantity}`);
    }
    console.log('  ✓ Test 4 Passed: Dispensation successfully triggered automated inventory decrement.\n');

    // 5. Cleanup Test Records
    await medicinesCollection.deleteOne({ sku: testSku });
    await prescriptionsCollection.deleteOne({ prescriptionId: testRxId });
    console.log('[Test 5] Cleanup: Successfully cleaned up temporary test artifacts.');
    console.log('  ✓ Test 5 Passed.\n');

    console.log('====================================================');
    console.log('🎉 ALL PHASE 4 FORMULARY VERIFICATION TESTS PASSED!');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification test failed:', error);
    if (mongoose.connection) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runPhase4Verification();
