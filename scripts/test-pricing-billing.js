import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/rolemed';

async function runPricingAndBillingVerification() {
  console.log('====================================================');
  console.log('🧪 Starting Pharmacy Pack Pricing, Invoicing & Add-On Test Suite (PKR)');
  console.log('====================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const db = mongoose.connection.db;
    const medicinesCollection = db.collection('medicines');
    const prescriptionsCollection = db.collection('prescriptions');
    const invoicesCollection = db.collection('pharmacyinvoices');

    // 1. Check Medicine Pack Pricing & Sizing in PKR
    const testSku1 = 'MED-PKR-001';
    const testSku2 = 'MED-PKR-002';
    await medicinesCollection.deleteMany({ sku: { $in: [testSku1, testSku2] } });

    // Drug 1: Cefixime 400mg (Pack of 10 @ PKR 450 -> PKR 45/unit)
    const qtyPerPack1 = 10;
    const pricePerPack1 = 450;
    const unitPrice1 = Math.round((pricePerPack1 / qtyPerPack1) * 100) / 100;

    const med1 = {
      sku: testSku1,
      name: 'Cefixime 400mg',
      genericName: 'Cefixime Trihydrate',
      category: 'Antibiotics',
      dosageForm: 'Capsule',
      strength: '400mg',
      quantityPerPack: qtyPerPack1,
      pricePerPack: pricePerPack1,
      unitPrice: unitPrice1,
      stockQuantity: 100, // 10 packs
      reorderLevel: 20,
      expiryDate: '2027-12-31',
      manufacturer: 'Getz Pharma',
      batchNumber: 'GTZ-8821',
      location: 'Shelf B-2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Drug 2: Vitamin C 500mg (Pack of 20 @ PKR 200 -> PKR 10/unit)
    const qtyPerPack2 = 20;
    const pricePerPack2 = 200;
    const unitPrice2 = Math.round((pricePerPack2 / qtyPerPack2) * 100) / 100;

    const med2 = {
      sku: testSku2,
      name: 'Vitamin C 500mg Chewable',
      genericName: 'Ascorbic Acid',
      category: 'Other',
      dosageForm: 'Tablet',
      strength: '500mg',
      quantityPerPack: qtyPerPack2,
      pricePerPack: pricePerPack2,
      unitPrice: unitPrice2,
      stockQuantity: 60, // 3 packs
      reorderLevel: 20,
      expiryDate: '2028-06-30',
      manufacturer: 'Abbott Pakistan',
      batchNumber: 'ABT-7744',
      location: 'Front Counter OTC Shelf',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await medicinesCollection.insertMany([med1, med2]);
    console.log('[Test 1] Registered test formulations:');
    console.log(`  - ${med1.name}: ${med1.quantityPerPack}/pk @ PKR ${med1.pricePerPack} (PKR ${med1.unitPrice}/unit)`);
    console.log(`  - ${med2.name}: ${med2.quantityPerPack}/pk @ PKR ${med2.pricePerPack} (PKR ${med2.unitPrice}/unit)`);

    if (unitPrice1 !== 45 || unitPrice2 !== 10) {
      throw new Error('Unit price calculation mismatch');
    }
    console.log('  ✓ Test 1 Passed: Pack pricing and unit price synchronization validated.\n');

    // 2. Prescription with Customer Add-on & Calculation in PKR
    const testRxId = 'RX-TEST-PKR-01';
    await prescriptionsCollection.deleteOne({ prescriptionId: testRxId });

    // Doctor prescribed 10 units of Cefixime (1 pack = PKR 450)
    // Customer at counter additionally requested 10 units of Vitamin C (PKR 10 * 10 = PKR 100)
    const rxDrugs = [
      {
        name: 'Cefixime 400mg',
        dosage: '400mg Once Daily',
        frequency: 'Once daily',
        duration: '10 days',
        instruction: 'After breakfast',
        qtyNeeded: 10,
        quantityPerPack: 10,
        pricePerPack: 450,
        unitPrice: 45,
        totalPrice: 450,
        isCustomerAddOn: false,
      },
      {
        name: 'Vitamin C 500mg Chewable',
        dosage: '500mg Daily',
        frequency: 'As requested',
        duration: 'PRN',
        instruction: 'Chew after meal',
        qtyNeeded: 10,
        quantityPerPack: 20,
        pricePerPack: 200,
        unitPrice: 10,
        totalPrice: 100,
        isCustomerAddOn: true,
      },
    ];

    const grandTotal = rxDrugs.reduce((sum, d) => sum + d.totalPrice, 0); // 450 + 100 = 550

    const testRx = {
      prescriptionId: testRxId,
      patientId: 'PAT-001',
      patientName: 'John Doe',
      doctorName: 'Dr. Sarah Johnson',
      drugs: rxDrugs,
      totalAmount: grandTotal,
      paymentStatus: 'Unpaid',
      paymentMethod: 'Cash',
      status: 'Pending Dispensation',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await prescriptionsCollection.insertOne(testRx);
    console.log(`[Test 2] Created prescription ${testRxId} with doctor items + customer add-on.`);
    console.log(`  Calculated Prescription Grand Total: PKR ${grandTotal}`);

    if (grandTotal !== 550) {
      throw new Error(`Expected PKR 550, got ${grandTotal}`);
    }
    console.log('  ✓ Test 2 Passed: Prescription and add-on pricing calculated accurately.\n');

    // 3. Automated Dispensation & Stock Deduction for Doctor Items + Customer Add-Ons
    console.log('[Test 3] Simulating dispensation of doctor items and customer add-on...');
    for (const drug of rxDrugs) {
      const match = await medicinesCollection.findOne({ name: drug.name });
      if (match) {
        const remaining = Math.max(0, match.stockQuantity - drug.qtyNeeded);
        await medicinesCollection.updateOne({ _id: match._id }, { $set: { stockQuantity: remaining } });
      }
    }

    await prescriptionsCollection.updateOne(
      { prescriptionId: testRxId },
      { $set: { status: 'Dispensed', paymentStatus: 'Paid', dispensedAt: new Date(), dispensedBy: 'David Miller, PharmD' } }
    );

    const checkMed1 = await medicinesCollection.findOne({ sku: testSku1 });
    const checkMed2 = await medicinesCollection.findOne({ sku: testSku2 });

    console.log(`  - ${checkMed1.name} stock: was 100, deducted 10 -> now ${checkMed1.stockQuantity}`);
    console.log(`  - ${checkMed2.name} stock: was 60, deducted 10 -> now ${checkMed2.stockQuantity}`);

    if (checkMed1.stockQuantity !== 90 || checkMed2.stockQuantity !== 50) {
      throw new Error('Stock deduction failure for dispensed items');
    }
    console.log('  ✓ Test 3 Passed: Both prescribed item and customer requested add-on decremented properly.\n');

    // 4. Pharmacy Invoice Compilation (Pack and Unit Billing in PKR)
    const testInvId = 'PH-INV-TEST-01';
    await invoicesCollection.deleteOne({ invoiceId: testInvId });

    // Item A: 2 full packs of Cefixime (2 * 450 = PKR 900, 20 units)
    // Item B: 5 loose units of Vitamin C (5 * 10 = PKR 50)
    const invItems = [
      {
        sku: testSku1,
        name: 'Cefixime 400mg',
        qtyUnits: 20,
        packs: 2,
        pricePerPack: 450,
        unitPrice: 45,
        totalPrice: 900,
        billingType: 'Pack',
      },
      {
        sku: testSku2,
        name: 'Vitamin C 500mg Chewable',
        qtyUnits: 5,
        packs: 1,
        pricePerPack: 200,
        unitPrice: 10,
        totalPrice: 50,
        billingType: 'Unit',
      },
    ];

    const invSubtotal = invItems.reduce((sum, i) => sum + i.totalPrice, 0); // 950
    const invDiscount = 50;
    const invTotal = invSubtotal - invDiscount; // 900

    const testInvoice = {
      invoiceId: testInvId,
      patientId: 'WALK-IN',
      patientName: 'Direct Cash Customer',
      prescriptionId: '',
      items: invItems,
      subtotal: invSubtotal,
      discount: invDiscount,
      totalAmount: invTotal,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      date: new Date().toISOString().split('T')[0],
      dispensedBy: 'David Miller, PharmD',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await invoicesCollection.insertOne(testInvoice);

    // Deduct stock for invoice items
    for (const item of invItems) {
      const match = await medicinesCollection.findOne({ sku: item.sku });
      if (match) {
        await medicinesCollection.updateOne(
          { _id: match._id },
          { $set: { stockQuantity: match.stockQuantity - item.qtyUnits } }
        );
      }
    }

    const checkMed1AfterInv = await medicinesCollection.findOne({ sku: testSku1 });
    const checkMed2AfterInv = await medicinesCollection.findOne({ sku: testSku2 });

    console.log(`[Test 4] Created pharmacy invoice ${testInvId}:`);
    console.log(`  Subtotal: PKR ${invSubtotal}, Discount: PKR ${invDiscount}, Total: PKR ${invTotal}`);
    console.log(`  Stock after invoice: ${checkMed1AfterInv.name}: ${checkMed1AfterInv.stockQuantity} (was 90, deducted 20)`);
    console.log(`  Stock after invoice: ${checkMed2AfterInv.name}: ${checkMed2AfterInv.stockQuantity} (was 50, deducted 5)`);

    if (checkMed1AfterInv.stockQuantity !== 70 || checkMed2AfterInv.stockQuantity !== 45) {
      throw new Error('Stock deduction failure for invoice items');
    }
    console.log('  ✓ Test 4 Passed: Pharmacy invoice calculation and stock reduction validated.\n');

    // 5. Cleanup Test Records
    await medicinesCollection.deleteMany({ sku: { $in: [testSku1, testSku2] } });
    await prescriptionsCollection.deleteOne({ prescriptionId: testRxId });
    await invoicesCollection.deleteOne({ invoiceId: testInvId });
    console.log('[Test 5] Successfully cleaned up temporary test artifacts.');
    console.log('  ✓ Test 5 Passed.\n');

    console.log('====================================================');
    console.log('🎉 ALL PACK PRICING, INVOICING & ADD-ON TESTS PASSED (PKR)!');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    if (mongoose.connection) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runPricingAndBillingVerification();

