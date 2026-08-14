/**
 * DriftGuard Master Test Runner - Executes All 5 Test Suites
 */

import pc from 'picocolors';
import { runUseCase1 } from './use-cases/uc1-path-clustering.test';
import { runUseCase2 } from './use-cases/uc2-breaking-type-removal.test';
import { runUseCase3 } from './use-cases/uc3-enum-status-drift.test';
import { runUseCase4 } from './use-cases/uc4-backward-compatible-evolution.test';
import { runUseCase5 } from './use-cases/uc5-playwright-e2e-traffic.test';
import { logger } from '../src/utils/logger';

async function main() {
  const startTime = Date.now();
  logger.banner('DRIFTGUARD AUTOMATED TEST SUITE RUNNER');

  const testSuites = [
    runUseCase1,
    runUseCase2,
    runUseCase3,
    runUseCase4,
    runUseCase5,
  ];

  const results: Array<{ name: string; passed: boolean; durationMs: number; error?: string }> = [];

  for (const suite of testSuites) {
    const t0 = Date.now();
    try {
      const res = await suite();
      results.push({
        name: res.name,
        passed: res.passed,
        durationMs: Date.now() - t0,
        error: res.error,
      });
    } catch (err: any) {
      results.push({
        name: suite.name,
        passed: false,
        durationMs: Date.now() - t0,
        error: err.message,
      });
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n' + pc.bold('================================================================'));
  console.log(pc.bold('                   TEST EXECUTION MATRIX SUMMARY                '));
  console.log(pc.bold('================================================================'));

  results.forEach((r, idx) => {
    const statusBadge = r.passed
      ? pc.bgGreen(pc.black(pc.bold(' PASS ')))
      : pc.bgRed(pc.white(pc.bold(' FAIL ')));
    const timeStr = pc.gray(`${r.durationMs}ms`);
    console.log(` ${statusBadge}  ${pc.white(r.name.padEnd(54))} ${timeStr}`);
    if (!r.passed && r.error) {
      console.log(`        ${pc.red('Error:')} ${pc.red(r.error)}`);
    }
  });

  console.log(pc.bold('================================================================'));
  console.log(` Total Suites: ${results.length} | Passed: ${pc.green(passedCount)} | Failed: ${failedCount > 0 ? pc.red(failedCount) : pc.green(failedCount)} | Time: ${totalTime}s`);
  console.log(pc.bold('================================================================\n'));

  if (failedCount > 0) {
    logger.critical(`Test suite run completed with ${failedCount} failure(s).`);
    process.exit(1);
  } else {
    logger.success(`All ${passedCount} DriftGuard test suites executed successfully!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running DriftGuard tests:', err);
  process.exit(1);
});
