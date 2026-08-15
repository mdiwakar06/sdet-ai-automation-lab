/**
 * DriftGuard Master Test Runner - Executes All 5 Automated Test Suites
 */

import pc from 'picocolors';
import { runUseCase1 } from './use-cases/uc1-path-clustering.test';
import { runUseCase2 } from './use-cases/uc2-breaking-type-removal.test';
import { runUseCase3 } from './use-cases/uc3-enum-status-drift.test';
import { runUseCase4 } from './use-cases/uc4-backward-compatible-evolution.test';
import { runUseCase5 } from './use-cases/uc5-playwright-e2e-traffic.test';
import { logger } from '../src/utils/logger';

interface SuiteResult {
  name: string;
  passed: boolean;
  assertionsCount: number;
  durationMs: number;
  error?: string;
}

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

  const results: SuiteResult[] = [];

  for (const suite of testSuites) {
    const t0 = Date.now();
    try {
      const res = await suite();
      results.push({
        name: res.name,
        passed: res.passed,
        assertionsCount: res.assertionsCount || 0,
        durationMs: Date.now() - t0,
        error: res.error,
      });
    } catch (err: any) {
      results.push({
        name: suite.name,
        passed: false,
        assertionsCount: 0,
        durationMs: Date.now() - t0,
        error: err.message,
      });
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalAssertions = results.reduce((acc, r) => acc + r.assertionsCount, 0);

  console.log('\n' + pc.bold('========================================================================================'));
  console.log(pc.bold('                             TEST EXECUTION MATRIX SUMMARY                              '));
  console.log(pc.bold('========================================================================================'));
  console.log(` ${pc.gray('#')}  ${pc.gray('STATUS')}  ${pc.gray('SUITE NAME'.padEnd(58))} ${pc.gray('ASSERTIONS')}  ${pc.gray('TIME')}`);
  console.log(pc.gray('----------------------------------------------------------------------------------------'));

  results.forEach((r, idx) => {
    const num = pc.gray(String(idx + 1).padStart(2));
    const statusBadge = r.passed
      ? pc.bgGreen(pc.black(pc.bold(' PASS ')))
      : pc.bgRed(pc.white(pc.bold(' FAIL ')));
    const nameStr = pc.white(r.name.padEnd(58));
    const assertionsStr = pc.cyan(`${r.assertionsCount} passed`.padEnd(12));
    const timeStr = pc.gray(`${r.durationMs}ms`);

    console.log(` ${num} ${statusBadge} ${nameStr} ${assertionsStr} ${timeStr}`);
    if (!r.passed && r.error) {
      console.log(`        ${pc.red('Error:')} ${pc.red(r.error)}`);
    }
  });

  console.log(pc.bold('========================================================================================'));
  console.log(
    ` Total Suites: ${pc.bold(String(results.length))} | Total Assertions: ${pc.cyan(pc.bold(String(totalAssertions)))} | Passed: ${pc.green(pc.bold(String(passedCount)))} | Failed: ${
      failedCount > 0 ? pc.red(pc.bold(String(failedCount))) : pc.green(pc.bold('0'))
    } | Time: ${pc.bold(totalTime + 's')}`
  );
  console.log(pc.bold('========================================================================================\n'));

  if (failedCount > 0) {
    logger.critical(`Test suite run completed with ${failedCount} failure(s).`);
    process.exit(1);
  } else {
    logger.success(`All ${passedCount} DriftGuard test suites executed successfully! (${totalAssertions} assertions verified)`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running DriftGuard tests:', err);
  process.exit(1);
});
