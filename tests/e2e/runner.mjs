import { VowosInMemoryStore, VowosTestServer } from './harness.mjs';
import { runTier1Tests } from './tier1_feature_coverage.test.mjs';
import { runTier2Tests } from './tier2_boundary_corner.test.mjs';
import { runTier3Tests } from './tier3_cross_feature.test.mjs';
import { runTier4Tests } from './tier4_real_world_workloads.test.mjs';

async function main() {
  console.log('='.repeat(80));
  console.log('   VowOS Production Acceptance Audit — Opaque-Box E2E Test Suite');
  console.log('   Methodology: Category-Partition + BVA + Pairwise + Real-World Workloads');
  console.log('='.repeat(80));
  console.log(`Node Runtime: ${process.version} (${process.platform})`);
  console.log(`Started At:   ${new Date().toISOString()}`);
  console.log('-'.repeat(80));

  const store = new VowosInMemoryStore();
  const server = new VowosTestServer({ store });

  await server.start();
  console.log(`[Harness] Mock HTTP Server listening on ${server.baseUrl}`);
  console.log('-'.repeat(80));

  const suiteStart = Date.now();
  const tierReports = [];

  try {
    // Run Tier 1
    console.log('\n[1/4] Executing Tier 1: Feature Coverage Suite (50 Tests across 10 Feature Areas)...');
    const t1 = await runTier1Tests(server, store);
    tierReports.push(t1);
    console.log(`      ✓ Tier 1 Completed: ${t1.passed}/${t1.totalTests} passed (${t1.durationMs}ms)`);

    // Run Tier 2
    console.log('\n[2/4] Executing Tier 2: Boundary & Corner Cases Suite (50 Tests)...');
    const t2 = await runTier2Tests(server, store);
    tierReports.push(t2);
    console.log(`      ✓ Tier 2 Completed: ${t2.passed}/${t2.totalTests} passed (${t2.durationMs}ms)`);

    // Run Tier 3
    console.log('\n[3/4] Executing Tier 3: Pairwise Cross-Feature Interactions Suite (10 Tests)...');
    const t3 = await runTier3Tests(server, store);
    tierReports.push(t3);
    console.log(`      ✓ Tier 3 Completed: ${t3.passed}/${t3.totalTests} passed (${t3.durationMs}ms)`);

    // Run Tier 4
    console.log('\n[4/4] Executing Tier 4: Real-World Workload Scenarios Suite (5 Scenarios)...');
    const t4 = await runTier4Tests(server, store);
    tierReports.push(t4);
    console.log(`      ✓ Tier 4 Completed: ${t4.passed}/${t4.totalTests} passed (${t4.durationMs}ms)`);

  } finally {
    await server.stop();
  }

  const totalDuration = Date.now() - suiteStart;
  const grandTotal = tierReports.reduce((sum, r) => sum + r.totalTests, 0);
  const grandPassed = tierReports.reduce((sum, r) => sum + r.passed, 0);
  const grandFailed = tierReports.reduce((sum, r) => sum + r.failed, 0);

  console.log('\n' + '='.repeat(80));
  console.log('                          E2E TEST SUITE SUMMARY');
  console.log('='.repeat(80));
  console.log(
    'Tier Name'.padEnd(45) +
    'Total'.padStart(8) +
    'Passed'.padStart(9) +
    'Failed'.padStart(9) +
    'Duration'.padStart(9)
  );
  console.log('-'.repeat(80));

  for (const report of tierReports) {
    console.log(
      report.tier.padEnd(45) +
      String(report.totalTests).padStart(8) +
      String(report.passed).padStart(9) +
      String(report.failed).padStart(9) +
      `${report.durationMs}ms`.padStart(9)
    );
  }

  console.log('-'.repeat(80));
  console.log(
    'TOTAL SUITE VERIFICATION'.padEnd(45) +
    String(grandTotal).padStart(8) +
    String(grandPassed).padStart(9) +
    String(grandFailed).padStart(9) +
    `${totalDuration}ms`.padStart(9)
  );
  console.log('='.repeat(80));

  if (grandFailed > 0) {
    console.error(`\n❌ TEST SUITE FAILED: ${grandFailed} tests failed out of ${grandTotal}.`);
    for (const r of tierReports) {
      for (const t of r.results) {
        if (t.status === 'FAILED') {
          console.error(`  - [${r.tier}] ${t.name}`);
          console.error(`    Error: ${t.error}`);
          if (t.stack) console.error(`    Stack: ${t.stack.split('\n').slice(1, 4).join('\n')}`);
        }
      }
    }
    process.exitCode = 1;
  } else {
    console.log(`\n✅ TEST SUITE PASSED: 100% Success (${grandPassed}/${grandTotal} passed, 0 failures)`);
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('Fatal unhandled error in test runner:', err);
  process.exit(1);
});
