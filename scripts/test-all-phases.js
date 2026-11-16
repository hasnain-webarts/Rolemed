import { spawnSync } from 'child_process';
import path from 'path';

const suites = [
  { name: 'Phase 0 (Containment & Immediate Safety)', script: 'scripts/test-phase0-fixes.js' },
  { name: 'Phase 1 (Security, Privacy & RBAC)', script: 'scripts/test-phase1-fixes.js' },
  { name: 'Phase 2 (Clinical Workflow Correctness)', script: 'scripts/test-phase2-fixes.js' },
  { name: 'Phase 3 (Observability, Aggregations & Health)', script: 'scripts/test-phase3-fixes.js' },
  { name: 'Phase 4 (Indexes, DevOps, A11y & Pagination)', script: 'scripts/test-phase4-fixes.js' },
];

console.log('================================================================');
console.log('RoleMed RB-HMS Master Remediation Verification Engine');
console.log('Executing Comprehensive Audit Verification across All Phases');
console.log('================================================================\n');

let totalSuitesPassed = 0;

for (const suite of suites) {
  console.log(`\n▶ Running ${suite.name}...`);
  const result = spawnSync('node', [path.resolve(process.cwd(), suite.script)], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status === 0) {
    console.log(`✔ ${suite.name} PASSED`);
    totalSuitesPassed++;
  } else {
    console.error(`✖ ${suite.name} FAILED with exit code ${result.status}`);
    process.exit(1);
  }
}

console.log('\n================================================================');
console.log(`🏆 ALL ${totalSuitesPassed} / ${suites.length} REMEDIATION PHASES PASSED 100% VERIFICATION!`);
console.log('================================================================\n');
process.exit(0);

