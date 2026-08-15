/**
 * TraceRCA Automated Test Runner
 * Executes all 5 rigorous Use Case Test Suites, aggregates assertions, timings, and verification results.
 */

import chalk from 'chalk';
import { uc1Suite } from './use-cases/uc1-flakiness-scoring.test';
import { uc2Suite } from './use-cases/uc2-trace-zip-profiling.test';
import { uc3Suite } from './use-cases/uc3-zero-data-leak-scrubbing.test';
import { uc4Suite } from './use-cases/uc4-custom-reporter-triage.test';
import { uc5Suite } from './use-cases/uc5-gemini-triage-html-export.test';
import { SuiteResult } from './framework/test-runner';

async function runAllSuites(): Promise<void> {
  console.log(chalk.bold.magenta('\n================================================================================'));
  console.log(chalk.bold.magenta('       🧪 TRACERCA ENTERPRISE AUTOMATED USE CASE VERIFICATION SUITE'));
  console.log(chalk.bold.magenta('================================================================================'));

  const startTime = Date.now();
  const suites = [uc1Suite, uc2Suite, uc3Suite, uc4Suite, uc5Suite];
  const results: SuiteResult[] = [];

  for (const suite of suites) {
    const result = await suite.run();
    results.push(result);
  }

  const totalDuration = Date.now() - startTime;
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalAssertions = 0;

  console.log(chalk.bold.magenta('\n================================================================================'));
  console.log(chalk.bold.white('                           TEST EXECUTION SUMMARY'));
  console.log(chalk.bold.magenta('================================================================================\n'));

  for (const res of results) {
    totalTests += res.totalTests;
    totalPassed += res.passedTests;
    totalFailed += res.failedTests;
    totalAssertions += res.totalAssertions;

    const statusBadge = res.failedTests === 0
      ? chalk.bold.green(' PASS ')
      : chalk.bold.red(' FAIL ');

    const line = `${statusBadge} ${chalk.bold(res.suiteName.padEnd(52))} ` +
      `${chalk.cyan(String(res.passedTests) + '/' + String(res.totalTests) + ' passed')} | ` +
      `${chalk.yellow(String(res.totalAssertions) + ' assertions')} | ` +
      `${chalk.gray(String(res.durationMs) + 'ms')}`;

    console.log(line);
  }

  console.log(chalk.gray('\n--------------------------------------------------------------------------------'));
  console.log(
    `Suites:     ${results.filter(r => r.failedTests === 0).length} passed, ${results.length} total\n` +
    `Tests:      ${chalk.bold.green(totalPassed + ' passed')}, ${totalFailed > 0 ? chalk.bold.red(totalFailed + ' failed, ') : ''}${totalTests} total\n` +
    `Assertions: ${chalk.bold.yellow(totalAssertions + ' verified')}\n` +
    `Duration:   ${chalk.bold.cyan(totalDuration + 'ms')}`
  );
  console.log(chalk.bold.magenta('================================================================================\n'));

  if (totalFailed > 0) {
    console.error(chalk.bold.red(`❌ Test run failed with ${totalFailed} failing tests.`));
    process.exit(1);
  } else {
    console.log(chalk.bold.green('🎉 All 5 TraceRCA Use Case Suites passed with 100% success!\n'));
  }
}

runAllSuites().catch(err => {
  console.error(chalk.red('Fatal error during test run:'), err);
  process.exit(1);
});
