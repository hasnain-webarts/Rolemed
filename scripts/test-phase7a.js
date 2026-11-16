const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect('mongodb://localhost:27017/rolemed');
};

async function runTests() {
  console.log('====================================================');
  console.log('🏥 ROLEMED RB-HMS: PHASE 7A E2E TEST SUITE');
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
  const DutyRoster = getModel('DutyRoster');
  const AuditLog = getModel('AuditLog');

  // Test 1: Check absence of mock data in the 4 modified frontend files
  console.log('🧪 TEST 1: Verify Zero Mock Data in Phase 7A Files');
  const filesToCheck = [
    'app/dashboard/receptionist/duties/page.js',
    'app/dashboard/doctor/schedule/page.js',
    'app/dashboard/doctor/profile/page.js',
    'app/dashboard/receptionist/profile/page.js',
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.join(__dirname, '..', relPath);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Check no $150.00
    const hasDollarMock = content.includes('$150.00');
    assert(!hasDollarMock, `No hardcoded dollar consult fee ($150.00) in ${relPath}`);

    // Check no mock RST-701 in duties
    if (relPath.includes('duties')) {
      const hasRstMock = content.includes('RST-701') || content.includes('Nurse Joy');
      assert(!hasRstMock, `No hardcoded RST-701 or Nurse Joy mock array in ${relPath}`);
    }
  }

  // Test 2: User Model Schema Validation
  console.log('\n🧪 TEST 2: User Schema Supports Phase 7A Fields');
  const doc = await User.findOne({ role: 'doctor' });
  assert(!!doc, 'Found active doctor account in MongoDB');

  doc.consultationFee = 3000;
  doc.bio = 'Cardiologist with 15 years experience in Pakistan and UK.';
  doc.isOnCall = true;
  await doc.save();

  const reloadedDoc = await User.findById(doc._id);
  assert(reloadedDoc.consultationFee === 3000, `Doctor consultation fee persisted in PKR: Rs. ${reloadedDoc.consultationFee}`);
  assert(reloadedDoc.bio.includes('Cardiologist'), 'Doctor bio persisted to MongoDB');

  // Test 3: Receptionist Profile Persistence
  console.log('\n🧪 TEST 3: Receptionist Profile Persistence');
  const rec = await User.findOne({ role: 'receptionist' });
  assert(!!rec, 'Found active receptionist account in MongoDB');

  rec.deskStation = 'ER Triage Desk • Bay 3';
  rec.phone = '+92 300 9876543';
  await rec.save();

  const reloadedRec = await User.findById(rec._id);
  assert(reloadedRec.deskStation === 'ER Triage Desk • Bay 3', `Desk station persisted: ${reloadedRec.deskStation}`);
  assert(reloadedRec.phone === '+92 300 9876543', `Phone direct line persisted: ${reloadedRec.phone}`);

  // Test 4: Doctor Schedule & Leave Management
  console.log('\n🧪 TEST 4: Doctor Schedule & Leave Persistence');
  const testSchedule = [
    { day: 'Monday', active: true, start: '10:00 AM', end: '06:00 PM', slotDuration: '20 mins' },
    { day: 'Tuesday', active: true, start: '10:00 AM', end: '06:00 PM', slotDuration: '20 mins' },
  ];

  const testLeave = {
    id: `LV-${Date.now()}`,
    startDate: '2026-12-10',
    endDate: '2026-12-15',
    reason: 'Surgical Conference London',
    status: 'Approved',
  };

  doc.weeklySchedule = testSchedule;
  doc.leaves = [testLeave];
  doc.isOnCall = false;
  await doc.save();

  const verifiedDoc = await User.findById(doc._id);
  assert(verifiedDoc.weeklySchedule.length === 2 && verifiedDoc.weeklySchedule[0].slotDuration === '20 mins', 'Custom weekly consulting slots persisted in MongoDB');
  assert(verifiedDoc.leaves.length >= 1 && verifiedDoc.leaves[0].reason === 'Surgical Conference London', 'Leave application recorded and persisted in MongoDB');
  assert(verifiedDoc.isOnCall === false, 'Emergency On-Call status toggle persisted as false in MongoDB');

  // Test 5: Receptionist Shift Assignment via DutyRoster
  console.log('\n🧪 TEST 5: Receptionist Duty Shift Assignment in MongoDB');
  const shiftDate = new Date().toISOString().split('T')[0];
  const newRoster = await DutyRoster.create({
    staff: rec._id,
    staffName: rec.name,
    role: 'Receptionist',
    department: 'Emergency Desk (ER)',
    shift: 'Morning (08:00 - 16:00)',
    date: shiftDate,
    status: 'Active',
    notes: 'Scheduled by Receptionist Intake Portal for triage desk',
  });

  assert(!!newRoster._id, `Created DutyRoster shift record: ${newRoster._id}`);
  const queriedRoster = await DutyRoster.findById(newRoster._id);
  assert(queriedRoster && queriedRoster.department === 'Emergency Desk (ER)', 'Queried shift assignment from DutyRoster collection');

  // Cleanup shift
  await DutyRoster.findByIdAndDelete(newRoster._id);
  const deletedRoster = await DutyRoster.findById(newRoster._id);
  assert(!deletedRoster, 'Revoked duty shift assignment cleaned up successfully');

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

