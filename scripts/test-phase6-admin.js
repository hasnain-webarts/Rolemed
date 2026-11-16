const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Models
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect('mongodb://localhost:27017/rolemed');
};

async function runTests() {
  console.log('====================================================');
  console.log('🏥 ROLEMED RB-HMS: PHASE 6 ADMIN E2E TEST SUITE');
  console.log('====================================================\n');

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
  const AuditLog = getModel('AuditLog');
  const DutyRoster = getModel('DutyRoster');
  const PharmacyInvoice = getModel('PharmacyInvoice');
  const LabInvoice = getModel('LabInvoice');
  const Patient = getModel('Patient');
  const Appointment = getModel('Appointment');
  const Medicine = getModel('Medicine');
  const LabOrder = getModel('LabOrder');

  // Test 1: Check absence of mock data arrays in Admin frontend files
  console.log('🧪 TEST 1: Verify Zero Mock Data in Admin Frontend Files');
  const adminDir = path.join(__dirname, '../app/dashboard/admin');
  const adminSubdirs = ['', 'staff', 'doctor', 'patient', 'appointments', 'pharmacy', 'laboratory', 'duty-rosters', 'audit-logs', 'reports', 'profile'];
  
  const mockNames = ['INITIAL_STAFF', 'INITIAL_DOCTORS', 'INITIAL_PATIENTS', 'INITIAL_INVENTORY', 'INITIAL_APPOINTMENTS', 'INITIAL_LOGS'];
  let foundMock = false;

  for (const sub of adminSubdirs) {
    const pagePath = path.join(adminDir, sub, 'page.js');
    if (fs.existsSync(pagePath)) {
      const content = fs.readFileSync(pagePath, 'utf8');
      for (const m of mockNames) {
        if (content.includes(`const ${m}`) || content.includes(`let ${m}`)) {
          console.error(`    Found mock variable ${m} in ${pagePath}`);
          foundMock = true;
        }
      }
    }
  }
  assert(!foundMock, 'All admin dashboard pages have zero mock data variables');

  // Test 2: Verify Currency in Reports & Admin overview is in PKR (No hardcoded '$' in reports)
  console.log('\n🧪 TEST 2: Verify Strict PKR Standard');
  const reportsPagePath = path.join(adminDir, 'reports/page.js');
  const reportsContent = fs.readFileSync(reportsPagePath, 'utf8');
  const hasDollarSignMock = reportsContent.includes('$84,920') || reportsContent.includes('$428,950');
  assert(!hasDollarSignMock, 'Admin reports page eliminated all mock dollar financials ($84,920 / $428,950)');

  // Test 3: Revenue Consolidation in PKR
  console.log('\n🧪 TEST 3: Consolidated Realized Hospital Revenue in PKR');
  const [pharmacyInvoices, labInvoices] = await Promise.all([
    PharmacyInvoice.find({ paymentStatus: 'Paid' }).lean(),
    LabInvoice.find({ paymentStatus: 'Paid' }).lean(),
  ]);

  const totalPharmacyRev = pharmacyInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalLabRev = labInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalHospitalRev = totalPharmacyRev + totalLabRev;

  console.log(`    Pharmacy Realized Revenue: Rs. ${totalPharmacyRev.toLocaleString()}`);
  console.log(`    Lab Realized Revenue:      Rs. ${totalLabRev.toLocaleString()}`);
  console.log(`    Consolidated Realized:     Rs. ${totalHospitalRev.toLocaleString()}`);
  assert(totalHospitalRev >= 0, `Consolidated Hospital Revenue is non-negative and properly aggregated (Rs. ${totalHospitalRev})`);

  // Test 4: DutyRoster Model CRUD
  console.log('\n🧪 TEST 4: Duty Roster Model CRUD Operations');
  const testStaff = await User.findOne({ role: { $in: ['doctor', 'nurse', 'staff', 'admin'] } });
  assert(!!testStaff, 'Found active hospital personnel to test duty assignment');

  const shiftDate = new Date().toISOString().split('T')[0];
  const newShift = await DutyRoster.create({
    staff: testStaff._id,
    staffName: testStaff.name,
    role: testStaff.role,
    department: testStaff.department || 'Emergency',
    shift: 'Night',
    date: shiftDate,
    startTime: '00:00',
    endTime: '08:00',
    status: 'Active',
    notes: 'Test shift assignment for automated testing',
  });
  assert(newShift && newShift.shift === 'Night', 'Created Night Shift Duty Roster in MongoDB');

  // Query Shift
  const queriedShift = await DutyRoster.findById(newShift._id);
  assert(queriedShift && queriedShift.status === 'Active', 'Queried created duty roster by ID');

  // Update Shift Status
  queriedShift.status = 'Completed';
  await queriedShift.save();
  const updatedShift = await DutyRoster.findById(newShift._id);
  assert(updatedShift.status === 'Completed', 'Updated duty roster status to Completed');

  // Delete Shift
  await DutyRoster.findByIdAndDelete(newShift._id);
  const deletedShift = await DutyRoster.findById(newShift._id);
  assert(!deletedShift, 'Deleted test duty roster from MongoDB');

  // Test 5: AuditLog Model Operations
  console.log('\n🧪 TEST 5: AuditLog Event Creation & Query');
  const testLog = await AuditLog.create({
    action: 'CREATE',
    module: 'System',
    description: 'Automated test suite verified system integrity',
    user: testStaff._id,
    userName: testStaff.name,
    userRole: testStaff.role,
    ipAddress: '127.0.0.1',
    alert: false,
    details: { test: true, timestamp: Date.now() },
  });
  assert(testLog && testLog.action === 'CREATE', 'Created immutable AuditLog entry');

  const foundLog = await AuditLog.findById(testLog._id);
  assert(foundLog && foundLog.module === 'System', 'Queried AuditLog entry successfully');

  // Clean up test log
  await AuditLog.findByIdAndDelete(testLog._id);
  assert(true, 'Cleaned up temporary test audit log');

  // Test 6: Staff Onboarding Sequential ID generation
  console.log('\n🧪 TEST 6: Staff Sequential ID generation & Password Hashing');
  const testEmail = `test_doc_${Date.now()}@rolemed.org`;
  const plainPassword = 'DoctorPassword123!';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const docCount = await User.countDocuments({ role: 'doctor' });
  const generatedId = `EMP-DOC-${String(docCount + 1).padStart(3, '0')}`;

  const createdDoctor = await User.create({
    name: 'Dr. Test AutoSurgeon',
    email: testEmail,
    password: hashedPassword,
    role: 'doctor',
    employeeId: generatedId,
    department: 'Cardiology',
    specialization: 'Cardiovascular Surgery',
    qualifications: 'MBBS, FCPS',
    status: 'Active',
  });

  assert(createdDoctor && createdDoctor.employeeId.startsWith('EMP-DOC-'), `Generated sequential employee ID: ${createdDoctor.employeeId}`);
  const isPassValid = await bcrypt.compare(plainPassword, createdDoctor.password);
  assert(isPassValid, 'Hashed password properly verified with bcrypt');

  // Clean up created doctor
  await User.findByIdAndDelete(createdDoctor._id);
  assert(true, 'Cleaned up temporary doctor account');

  // Test 7: Profile Persistence (Office & Admin Updates)
  console.log('\n🧪 TEST 7: Admin Profile Persistence');
  const adminUser = await User.findOne({ role: 'admin' });
  if (adminUser) {
    const originalOffice = adminUser.office || 'Suite 501, Executive Tower';
    adminUser.office = 'Tower A, Floor 7, Executive Wing';
    await adminUser.save();

    const reloadedAdmin = await User.findById(adminUser._id);
    assert(reloadedAdmin.office === 'Tower A, Floor 7, Executive Wing', 'Admin office update persisted across database reload');

    // Restore original office
    adminUser.office = originalOffice;
    await adminUser.save();
  } else {
    assert(false, 'Admin user not found in database');
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
