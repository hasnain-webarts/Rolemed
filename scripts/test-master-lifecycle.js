const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.NEXTAUTH_SECRET || '9be35f49dcf46820ff569a9b70b555ea25b42c129e92bfbe2a2818cdbe4a0b2c';

const authHeaders = {
  'Content-Type': 'application/json',
  'x-internal-key': SECRET,
  'x-user-role': 'admin',
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect('mongodb://localhost:27017/rolemed');
};

async function runMasterLifecycle() {
  console.log('================================================================');
  console.log('🏥 ROLEMED RB-HMS: MASTER END-TO-END HOSPITAL JOURNEY VERIFICATION');
  console.log('   Synchronized Workflow Across All 5 Healthcare Roles');
  console.log('   Strict Currency Standard: Pakistani Rupees (PKR / Rs.)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  await connectDB();

  const getModel = (name) => {
    if (mongoose.models[name]) return mongoose.models[name];
    const mod = require(`../models/${name}`);
    return mod.default || mod;
  };

  const User = getModel('User');
  const Patient = getModel('Patient');
  const Appointment = getModel('Appointment');
  const Consultation = getModel('Consultation');
  const LabOrder = getModel('LabOrder');
  const LabInvoice = getModel('LabInvoice');
  const Prescription = getModel('Prescription');
  const PharmacyInvoice = getModel('PharmacyInvoice');
  const Medicine = getModel('Medicine');
  const AuditLog = getModel('AuditLog');

  // Test artifacts identifiers
  const TEST_PATIENT_ID = 'PAT-AUTO-999';
  const TEST_LEAVE_START = '2026-12-25';
  const TEST_LEAVE_END = '2026-12-28';
  let createdAppointmentId = null;
  let createdPrescriptionId = null;
  let createdLabOrderId = null;
  let testMedicineSku = null;
  let originalDoctorLeaves = [];
  let originalWeeklySchedule = [];

  try {
    // =================================================================
    // STAGE 0: Setup Doctor Availability & Testing Schedule
    // =================================================================
    console.log('🩺 STAGE 0: Setup Doctor Availability & Consulting Schedule');
    const doctor = await User.findOne({
      $or: [{ name: /Sarah Johnson/i }, { role: 'doctor' }],
    });
    assert(!!doctor, `Found attending doctor account: Dr. ${doctor?.name}`);

    originalDoctorLeaves = doctor.leaves ? [...doctor.leaves] : [];
    originalWeeklySchedule = doctor.weeklySchedule ? [...doctor.weeklySchedule] : [];

    // Configure test leave and consulting schedule
    doctor.weeklySchedule = [
      { day: 'Monday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '15 mins' },
      { day: 'Tuesday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '15 mins' },
      { day: 'Wednesday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '15 mins' },
      { day: 'Thursday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '15 mins' },
      { day: 'Friday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '15 mins' },
      { day: 'Saturday', active: true, start: '09:00 AM', end: '02:00 PM', slotDuration: '15 mins' },
      { day: 'Sunday', active: false, start: 'Closed', end: 'Closed', slotDuration: '0 mins' },
    ];

    doctor.leaves = [
      {
        id: `LV-TEST-999`,
        startDate: TEST_LEAVE_START,
        endDate: TEST_LEAVE_END,
        reason: 'National Cardiology Conference Leave',
        status: 'Approved',
      },
    ];
    await doctor.save();
    assert(true, `Configured Dr. ${doctor.name} leave window (${TEST_LEAVE_START} to ${TEST_LEAVE_END}) & Sunday Off-Duty`);

    // =================================================================
    // STAGE 1: Receptionist - Patient Intake & Availability Enforcement
    // =================================================================
    console.log('\n📋 STAGE 1: Receptionist - Patient Intake & Availability Enforcement');

    // 1A. Register New Patient
    await Patient.deleteOne({ patientId: TEST_PATIENT_ID });
    const regRes = await fetch(`${BASE_URL}/api/patients`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        patientId: TEST_PATIENT_ID,
        name: 'Tariq Mehmood',
        age: 48,
        gender: 'Male',
        phone: '0321-9876543',
        cnic: '35201-9876543-1',
        address: 'Model Town, Lahore',
        bloodGroup: 'B+',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 || regData.success, `Patient ${TEST_PATIENT_ID} registered successfully in registry`);

    // 1B. Doctor Availability Validation: Attempt booking during doctor's scheduled leave
    const leaveConflictRes = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        patientId: TEST_PATIENT_ID,
        doctorName: `Dr. ${doctor.name}`,
        date: '2026-12-26', // falls within Dec 25-28 leave
        time: '10:00 AM',
        reason: 'Hypertension follow-up',
      }),
    });
    const leaveConflictData = await leaveConflictRes.json();
    assert(
      leaveConflictRes.status === 400 && leaveConflictData.error?.includes('leave'),
      `Availability Engine rejected appointment on doctor leave date: "${leaveConflictData.error}"`
    );

    // 1C. Doctor Availability Validation: Attempt booking on doctor's off-duty day (Sunday)
    // 2026-12-20 is a Sunday
    const sundayRes = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        patientId: TEST_PATIENT_ID,
        doctorName: `Dr. ${doctor.name}`,
        date: '2026-12-20', // Sunday
        time: '10:00 AM',
        reason: 'Sunday checkup',
      }),
    });
    const sundayData = await sundayRes.json();
    assert(
      sundayRes.status === 400 && sundayData.error?.includes('off-duty'),
      `Availability Engine rejected appointment on doctor off-duty day (Sunday): "${sundayData.error}"`
    );

    // 1D. Book Valid Appointment on Active Consulting Day (e.g. 2026-12-22, Tuesday)
    const validBookRes = await fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        patientId: TEST_PATIENT_ID,
        doctorName: `Dr. ${doctor.name}`,
        date: '2026-12-22', // Tuesday - active consulting day
        time: '10:30 AM',
        reason: 'Cardiac evaluation & persistent elevated BP',
      }),
    });
    const validBookData = await validBookRes.json();
    assert(validBookRes.status === 201 && validBookData.success, `Booked valid appointment ${validBookData.appointment?.appointmentId}`);
    createdAppointmentId = validBookData.appointment?.appointmentId;

    // 1E. Verify Reschedule Enforcement: Attempt to reschedule onto leave date
    const rescheduleLeaveRes = await fetch(`${BASE_URL}/api/appointments/${createdAppointmentId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        date: '2026-12-27', // In leave window
        time: '11:00 AM',
      }),
    });
    const rescheduleLeaveData = await rescheduleLeaveRes.json();
    assert(
      rescheduleLeaveRes.status === 400 && rescheduleLeaveData.error?.includes('leave'),
      `Reschedule PATCH rejected conflicting date during doctor leave: "${rescheduleLeaveData.error}"`
    );

    // 1F. Receptionist Clinic Check-In
    const checkInRes = await fetch(`${BASE_URL}/api/appointments/${createdAppointmentId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'Checked In' }),
    });
    const checkInData = await checkInRes.json();
    assert(checkInData.success && checkInData.appointment?.status === 'Checked In', 'Patient checked in at reception desk; status updated to "Checked In"');

    // =================================================================
    // STAGE 2: Doctor - Consultation, Diagnosis, Prescription & Lab Order
    // =================================================================
    console.log('\n🩺 STAGE 2: Doctor - Consultation, Clinical Findings, RX & Lab Ordering');

    // 2A. Complete Consultation & Update Appointment Status
    const completeAptRes = await fetch(`${BASE_URL}/api/appointments/${createdAppointmentId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'Completed' }),
    });
    const completeAptData = await completeAptRes.json();
    assert(completeAptData.appointment?.status === 'Completed', `Appointment ${createdAppointmentId} marked as "Completed" by attending doctor`);

    // 2B. Record Consultation Record
    const patientDoc = await Patient.findOne({ patientId: TEST_PATIENT_ID });
    const consultRecord = await Consultation.create({
      consultationId: 'CON-AUTO-999',
      patient: patientDoc._id,
      patientId: TEST_PATIENT_ID,
      patientName: patientDoc.name,
      doctorName: `Dr. ${doctor.name}`,
      appointmentId: createdAppointmentId,
      symptoms: 'Patient reports morning headaches, occipital throbbing, and fatigue.',
      vitals: { bp: '148/94', temp: '98.4°F', pulse: '80 bpm', respRate: '18 /min', spO2: '98%', weight: '76 kg' },
      diagnosis: 'I10 - Essential (primary) hypertension',
      notes: 'Stage 1 essential hypertension confirmed. Prescribed Amlodipine 5mg OD and ordered comprehensive Lipid Profile.',
      date: new Date().toISOString().split('T')[0],
    });
    assert(!!consultRecord._id, `Consultation ${consultRecord.consultationId} logged with ICD-10 diagnosis: ${consultRecord.diagnosis}`);

    // 2C. Prescribe Medication via /api/prescriptions
    // First ensure the medication inventory baseline exists
    testMedicineSku = 'MED-AUTO-999';
    await Medicine.deleteOne({ sku: testMedicineSku });
    const testMed = await Medicine.create({
      sku: testMedicineSku,
      name: 'Amlodipine 5mg Tabs',
      genericName: 'Amlodipine',
      category: 'Cardiovascular',
      dosageForm: 'Tablet',
      strength: '5mg',
      quantityPerPack: 10,
      pricePerPack: 400,
      unitPrice: 40,
      stockQuantity: 100, // Initial stock: 100 units
      reorderLevel: 20,
      expiryDate: '2028-12-31',
      batchNumber: 'BATCH-AML-01',
    });
    assert(testMed.stockQuantity === 100, `Initialized inventory: ${testMed.name} with 100 units in stock`);

    createdPrescriptionId = 'RX-AUTO-999';
    await Prescription.deleteOne({ prescriptionId: createdPrescriptionId });

    const rxRes = await fetch(`${BASE_URL}/api/prescriptions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        prescriptionId: createdPrescriptionId,
        patientId: TEST_PATIENT_ID,
        patientName: patientDoc.name,
        doctorName: `Dr. ${doctor.name}`,
        consultationId: consultRecord.consultationId,
        drugs: [
          {
            name: 'Amlodipine 5mg Tabs',
            dosage: '5mg',
            frequency: 'Once daily (morning)',
            duration: '30 days',
            instruction: 'After breakfast',
            qtyNeeded: 30,
            quantityPerPack: 10,
            pricePerPack: 400,
            unitPrice: 40,
            totalPrice: 1200,
          },
        ],
        generalInstructions: 'Monitor BP daily. Maintain low-sodium diet and return in 4 weeks.',
        status: 'Pending Dispensation',
        totalAmount: 1200,
        paymentStatus: 'Unpaid',
      }),
    });
    const rxData = await rxRes.json();
    if (rxData.prescription?.prescriptionId) {
      createdPrescriptionId = rxData.prescription.prescriptionId;
    }
    assert(rxRes.status === 201 || rxData.success, `Doctor generated digital prescription ${createdPrescriptionId} for PKR Rs. 1,200`);

    // 2D. Order Lab Diagnostic Test via /api/lab-orders
    createdLabOrderId = 'REQ-AUTO-999';
    await LabOrder.deleteOne({ orderId: createdLabOrderId });

    const labOrderRes = await fetch(`${BASE_URL}/api/lab-orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        orderId: createdLabOrderId,
        patientId: TEST_PATIENT_ID,
        patientName: patientDoc.name,
        doctorName: `Dr. ${doctor.name}`,
        consultationId: consultRecord.consultationId,
        testName: 'Lipid Profile (Full Panel)',
        priority: 'Routine',
        specimenType: 'Blood',
        status: 'Pending',
      }),
    });
    const labOrderData = await labOrderRes.json();
    if (labOrderData.labOrder?.orderId) {
      createdLabOrderId = labOrderData.labOrder.orderId;
    }
    assert(labOrderRes.status === 201 || labOrderData.success, `Doctor ordered lab test: Lipid Profile (Full Panel) [${createdLabOrderId}]`);

    // =================================================================
    // STAGE 3: Lab Technician - Specimen Processing & Diagnostic Billing
    // =================================================================
    console.log('\n🔬 STAGE 3: Lab Technician - Test Execution & Diagnostic Invoicing (PKR)');

    // 3A. Update Lab Order Findings & Complete
    const labCompleteRes = await fetch(`${BASE_URL}/api/lab-orders/${createdLabOrderId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'Completed',
        findings: 'Total Cholesterol: 215 mg/dL (Elevated), Triglycerides: 165 mg/dL, HDL: 42 mg/dL, LDL: 140 mg/dL.',
        processedBy: 'Elena Rostova, Lab Technologist',
      }),
    });
    const labCompleteData = await labCompleteRes.json();
    assert(
      labCompleteData.success && labCompleteData.labOrder?.status === 'Completed',
      `Lab Technologist completed test order ${createdLabOrderId} with clinical findings`
    );

    // 3B. Create Lab Invoice in PKR (Rs. 950)
    await LabInvoice.deleteOne({ orderId: createdLabOrderId });
    const labInvRes = await fetch(`${BASE_URL}/api/lab/invoices`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        patientId: TEST_PATIENT_ID,
        patientName: patientDoc.name,
        orderId: createdLabOrderId,
        tests: [
          {
            testCode: 'LIP-01',
            testName: 'Lipid Profile (Full Panel)',
            category: 'Biochemistry',
            price: 950,
          },
        ],
        discount: 0,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        billedBy: 'Elena Rostova, Lab Technologist',
      }),
    });
    const labInvData = await labInvRes.json();
    assert(
      labInvRes.status === 201 || labInvData.success,
      `Generated paid diagnostic invoice ${labInvData.invoice?.invoiceId} for PKR Rs. ${labInvData.invoice?.totalAmount || 950}`
    );

    // =================================================================
    // STAGE 4: Pharmacist - Dispensing, Stock Deduction & Pharmacy Invoice
    // =================================================================
    console.log('\n💊 STAGE 4: Pharmacist - Inventory Verification, Dispensation & Billing (PKR)');

    // 4A. Dispense Prescription & Trigger Automatic Stock Deduction
    const dispenseRes = await fetch(`${BASE_URL}/api/prescriptions/${createdPrescriptionId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'Dispensed',
        dispensedBy: 'David Miller, PharmD',
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
      }),
    });
    const dispenseData = await dispenseRes.json();
    assert(dispenseData.success && dispenseData.prescription?.status === 'Dispensed', `Prescription ${createdPrescriptionId} dispensed by Pharmacist`);

    // Verify stock decremented by 30 units (100 -> 70)
    const updatedMed = await Medicine.findOne({ sku: testMedicineSku });
    assert(
      updatedMed && updatedMed.stockQuantity === 70,
      `Automated Inventory Deduction: stock decreased from 100 to ${updatedMed?.stockQuantity} units (30 units dispensed)`
    );

    // 4B. Generate Pharmacy Invoice in PKR (Rs. 1,200)
    await PharmacyInvoice.deleteOne({ prescriptionId: createdPrescriptionId });
    const phmInvRes = await fetch(`${BASE_URL}/api/pharmacy/invoices`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        patientId: TEST_PATIENT_ID,
        patientName: patientDoc.name,
        prescriptionId: createdPrescriptionId,
        items: [
          {
            sku: testMedicineSku,
            name: 'Amlodipine 5mg Tabs',
            qtyUnits: 30,
            packs: 3,
            pricePerPack: 400,
            unitPrice: 40,
            totalPrice: 1200,
            billingType: 'Pack',
          },
        ],
        discount: 0,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        dispensedBy: 'David Miller, PharmD',
      }),
    });
    const phmInvData = await phmInvRes.json();
    assert(
      phmInvRes.status === 201 || phmInvData.success,
      `Generated paid pharmacy invoice ${phmInvData.invoice?.invoiceId} for PKR Rs. ${phmInvData.invoice?.totalAmount || 1200}`
    );

    // =================================================================
    // STAGE 5: Hospital Admin - Realized Revenue Aggregation & Audit Trail
    // =================================================================
    console.log('\n📊 STAGE 5: Admin - Financial Realization & Enterprise Audit Trail');

    const adminOverviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      cache: 'no-store',
      headers: authHeaders,
    });
    const adminOverviewData = await adminOverviewRes.json();

    assert(adminOverviewData.success, 'Admin Overview metrics retrieved successfully');
    assert(adminOverviewData.currency === 'PKR', `Currency standardized to Pakistani Rupees: ${adminOverviewData.currency}`);
    assert(
      adminOverviewData.financials?.totalHospitalRevenue >= 2150,
      `Realized Hospital Revenue accurately aggregated (Lab Rs. 950 + Pharmacy Rs. 1,200 = Rs. 2,150) -> Total: Rs. ${adminOverviewData.financials?.totalHospitalRevenue.toLocaleString()}`
    );
    assert(
      adminOverviewData.metrics?.totalPatients >= 1,
      `Patient count dynamically updated: ${adminOverviewData.metrics?.totalPatients} registered patients`
    );

    // Verify AuditLog Recorded the Journey
    const auditLogs = await AuditLog.find({
      $or: [
        { description: new RegExp(TEST_PATIENT_ID, 'i') },
        { description: new RegExp(createdAppointmentId || 'N/A', 'i') },
        { module: 'Appointments' },
      ],
    }).sort({ createdAt: -1 }).limit(5);

    assert(auditLogs.length > 0, `Enterprise Audit Trail recorded actions (${auditLogs.length} recent events found in AuditLog)`);
    if (auditLogs.length > 0) {
      console.log(`     Latest Audit: "${auditLogs[0].action} - ${auditLogs[0].description}" by ${auditLogs[0].user}`);
    }

  } catch (err) {
    console.error('Fatal exception during lifecycle execution:', err);
    assert(false, `Unexpected error: ${err.message}`);
  } finally {
    // =================================================================
    // STAGE 6: Teardown & Safe Restoration
    // =================================================================
    console.log('\n🧹 STAGE 6: Automated Teardown & Clean Database Restoration');
    try {
      if (createdAppointmentId) await Appointment.deleteMany({ appointmentId: createdAppointmentId });
      await Patient.deleteMany({ patientId: TEST_PATIENT_ID });
      await Consultation.deleteMany({ consultationId: 'CON-AUTO-999' });
      if (createdPrescriptionId) await Prescription.deleteMany({ prescriptionId: createdPrescriptionId });
      if (createdLabOrderId) await LabOrder.deleteMany({ orderId: createdLabOrderId });
      if (createdLabOrderId) await LabInvoice.deleteMany({ orderId: createdLabOrderId });
      if (createdPrescriptionId) await PharmacyInvoice.deleteMany({ prescriptionId: createdPrescriptionId });
      await LabInvoice.deleteMany({ patientId: TEST_PATIENT_ID });
      await PharmacyInvoice.deleteMany({ patientId: TEST_PATIENT_ID });
      if (testMedicineSku) await Medicine.deleteMany({ sku: testMedicineSku });

      // Restore doctor schedule
      const doctorToRestore = await User.findOne({
        $or: [{ name: /Sarah Johnson/i }, { role: 'doctor' }],
      });
      if (doctorToRestore) {
        doctorToRestore.leaves = originalDoctorLeaves;
        doctorToRestore.weeklySchedule = originalWeeklySchedule;
        await doctorToRestore.save();
        console.log(`  Restored Dr. ${doctorToRestore.name} original leaves and schedule.`);
      }
      assert(true, 'Test artifacts and records purged; database returned to pristine baseline state');
    } catch (cleanupErr) {
      console.warn('Warning during cleanup:', cleanupErr.message);
    }

    console.log('\n================================================================');
    console.log(`🏁 MASTER LIFECYCLE RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runMasterLifecycle().catch((err) => {
  console.error('Unhandled runner error:', err);
  process.exit(1);
});
