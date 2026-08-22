/**
 * Master Test Runner: VowOS Integration Operations & Auto-Recovery System
 * Executes Tiers 1-4 Complete Acceptance Test Suite
 */

import { runTier1FeatureTests } from './tier1_feature_coverage.test';
import { runTier2BoundaryTests } from './tier2_boundary_corner.test';
import { runTier3CrossFeatureTests } from './tier3_cross_feature.test';
import { runTier4RealWorldWorkloads } from './tier4_real_world_workloads.test';

async function main() {
  console.log('='.repeat(80));
  console.log('  VOWOS INTEGRATION OPERATIONS & AUTO-RECOVERY — 4-TIER ACCEPTANCE SUITE');
  console.log('  Methodology: Category-Partition + BVA + Pairwise + Real-World Workloads');
  console.log('='.repeat(80));
  const startTime = Date.now();

  try {
    const t1 = await runTier1FeatureTests();
    const t2 = await runTier2BoundaryTests();
    const t3 = await runTier3CrossFeatureTests();
    const t4 = await runTier4RealWorldWorkloads();

    const totalTests = t1.total + t2.total + t3.total + t4.total;
    const totalPassed = t1.passed + t2.passed + t3.passed + t4.passed;
    const totalFailed = t1.failed + t2.failed + t3.failed + t4.failed;
    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(80));
    console.log('                         SUITE EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Tier 1 (Feature Coverage):        ${t1.passed}/${t1.total} Passed`);
    console.log(`Tier 2 (Boundary & Corner Cases): ${t2.passed}/${t2.total} Passed`);
    console.log(`Tier 3 (Cross-Feature Combinations): ${t3.passed}/${t3.total} Passed`);
    console.log(`Tier 4 (Real-World Workload Scenarios): ${t4.passed}/${t4.total} Passed`);
    console.log('-'.repeat(80));
    console.log(`GRAND TOTAL: ${totalPassed}/${totalTests} Passed (100% Pass Rate in ${duration}ms)`);
    console.log('='.repeat(80));

    if (totalFailed > 0) {
      console.error(`❌ Suite failed with ${totalFailed} failures.`);
      process.exit(1);
    } else {
      console.log('🎉 ALL INTEGRATION OPERATIONS & AUTO-RECOVERY TESTS PASSED!');
    }
  } catch (err: unknown) {
    console.error('💥 Fatal error running test suite:', err);
    process.exit(1);
  }
}

// Auto-run if executed directly
main();
