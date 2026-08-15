/**
 * SynthDB - Master Test Runner
 * Executes all 5 ground-level automated test suites and reports aggregated results.
 */

import { runUc1Test } from './use-cases/uc1-ecommerce-crud.test';
import { runUc2Test } from './use-cases/uc2-deep-saas-hierarchy.test';
import { runUc3Test } from './use-cases/uc3-circular-fk-self-ref.test';
import { runUc4Test } from './use-cases/uc4-composite-keys-banking.test';
import { runUc5Test } from './use-cases/uc5-docker-sqlite-benchmark.test';
import { Logger } from '../src/utils/logger';

let pc: any;
try {
  pc = require('picocolors');
} catch {
  const id = (s: any) => String(s);
  pc = { cyan: id, green: id, yellow: id, red: id, blue: id, bold: id, dim: id, gray: id };
}

async function runAllSuites() {
  Logger.banner('SynthDB Automated Master Test Suite', 'Executing 5 Core Relational Engineering Use Cases');

  const startTime = performance.now();
  const results: Array<{ name: string; passed: boolean; assertions: number; durationMs: number; error?: string }> = [];

  const suites = [
    { fn: runUc1Test, name: 'UC-1: E-Commerce CRUD & Referential Integrity' },
    { fn: runUc2Test, name: 'UC-2: Deep SaaS Hierarchy & Determinism' },
    { fn: runUc3Test, name: 'UC-3: Circular FK & Self-Referential Graph' },
    { fn: runUc4Test, name: 'UC-4: Composite Keys & Banking Ledger' },
    { fn: runUc5Test, name: 'UC-5: Exporters, Docker & Benchmarks' }
  ];

  for (const suite of suites) {
    try {
      const res = await suite.fn();
      results.push(res);
    } catch (err: any) {
      console.error(pc.red(`\n✖ ${suite.name} FAILED:`), err.message);
      results.push({
        name: suite.name,
        passed: false,
        assertions: 0,
        durationMs: 0,
        error: err.message
      });
    }
  }

  const totalDuration = performance.now() - startTime;
  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;
  const totalAssertions = results.reduce((acc, r) => acc + r.assertions, 0);

  console.log('\n' + pc.bold(pc.cyan('='.repeat(70))));
  console.log(pc.bold(pc.cyan('  🏁 MASTER TEST RUNNER SUMMARY')));
  console.log(pc.bold(pc.cyan('='.repeat(70))));

  for (const res of results) {
    const status = res.passed ? pc.bold(pc.green('PASS')) : pc.bold(pc.red('FAIL'));
    const timeStr = pc.gray(`(${res.durationMs.toFixed(1)}ms, ${res.assertions} assertions)`);
    console.log(`  [${status}] ${res.name} ${timeStr}`);
  }

  console.log(pc.gray('-'.repeat(70)));
  console.log(`  Suites:      ${totalPassed === results.length ? pc.bold(pc.green(`${totalPassed} passed`)) : pc.bold(pc.red(`${totalFailed} failed, ${totalPassed} passed`))}, ${results.length} total`);
  console.log(`  Assertions:  ${pc.bold(pc.green(totalAssertions.toLocaleString()))} total assertions checked`);
  console.log(`  Duration:    ${pc.bold(pc.cyan(totalDuration.toFixed(2) + ' ms'))}`);
  console.log(pc.bold(pc.cyan('='.repeat(70))) + '\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllSuites().catch(err => {
  console.error('Master test runner fatal crash:', err);
  process.exit(1);
});
