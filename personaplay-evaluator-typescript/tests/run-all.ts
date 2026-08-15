/**
 * PersonaPlay Master Automated Test Runner
 * Executes all 5 test suites across the conversational AI evaluation engine.
 */

import { runUc1Test } from './use-cases/uc1-adversarial-redteam.test';
import { runUc2Test } from './use-cases/uc2-e2e-browser-eval.test';
import { runUc3Test } from './use-cases/uc3-judge-rubric-compliance.test';
import { runUc4Test } from './use-cases/uc4-conversational-stall.test';
import { runUc5Test } from './use-cases/uc5-multi-persona-benchmark.test';

// Self-contained ANSI color formatting helpers
const pc = {
  green: (s: any) => `\x1b[32m${s}\x1b[0m`,
  red: (s: any) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: any) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: any) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: any) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: any) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: any) => `\x1b[2m${s}\x1b[0m`,
  gray: (s: any) => `\x1b[90m${s}\x1b[0m`,
  bgGreen: (s: any) => `\x1b[42m\x1b[30m\x1b[1m${s}\x1b[0m`,
  bgRed: (s: any) => `\x1b[41m\x1b[37m\x1b[1m${s}\x1b[0m`,
};

async function main() {
  const startTime = performance.now();

  console.log('\n' + pc.bold(pc.cyan('======================================================================')));
  console.log(pc.bold(pc.cyan('  🎭 PERSONAPLAY: MASTER AUTOMATED TEST SUITE RUNNER                 ')));
  console.log(pc.bold(pc.cyan('     Agent-to-Agent Conversational AI Evaluator & Red-Teaming Engine  ')));
  console.log(pc.bold(pc.cyan('======================================================================\n')));

  const suites = [
    { fn: runUc1Test, name: 'UC-1: Adversarial Red-Teaming & Jailbreak Detection' },
    { fn: runUc2Test, name: 'UC-2: E2E Browser Automation & Debounce Polling' },
    { fn: runUc3Test, name: 'UC-3: LLM-as-a-Judge Rubric Compliance' },
    { fn: runUc4Test, name: 'UC-4: Conversational Stall & Repetition Guard' },
    { fn: runUc5Test, name: 'UC-5: Multi-Persona Benchmark & HTML Reporting' },
  ];

  const results: Array<{ name: string; passed: boolean; assertions: number; durationMs: number; error?: string }> = [];

  for (const suite of suites) {
    try {
      const res = await suite.fn();
      results.push(res);
    } catch (err: any) {
      results.push({
        name: suite.name,
        passed: false,
        assertions: 0,
        durationMs: 0,
        error: err.message || String(err),
      });
    }
  }

  const totalDuration = performance.now() - startTime;
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;
  const totalAssertions = results.reduce((acc, r) => acc + r.assertions, 0);

  console.log('\n' + pc.bold(pc.cyan('======================================================================')));
  console.log(pc.bold(pc.cyan('                   TEST EXECUTION MATRIX SUMMARY                      ')));
  console.log(pc.bold(pc.cyan('======================================================================')));

  for (const r of results) {
    const statusBadge = r.passed
      ? pc.bgGreen(' PASS ')
      : pc.bgRed(' FAIL ');
    const timeStr = pc.gray(`(${r.durationMs.toFixed(1)}ms, ${r.assertions} assertions)`);
    console.log(`  ${statusBadge}  ${pc.bold(r.name.padEnd(52))} ${timeStr}`);
    if (!r.passed && r.error) {
      console.log(`          ${pc.red('Error:')} ${pc.red(r.error)}`);
    }
  }

  console.log(pc.bold(pc.cyan('----------------------------------------------------------------------')));
  console.log(`  Suites:      ${totalPassed === results.length ? pc.bold(pc.green(`${totalPassed} passed`)) : pc.bold(pc.red(`${totalFailed} failed, ${totalPassed} passed`))}, ${results.length} total`);
  console.log(`  Assertions:  ${pc.bold(pc.green(totalAssertions.toLocaleString()))} total assertions checked`);
  console.log(`  Duration:    ${pc.bold(pc.cyan(totalDuration.toFixed(2) + ' ms'))}`);
  console.log(pc.bold(pc.cyan('======================================================================\n')));

  if (totalFailed > 0) {
    console.error(pc.red(`❌ Test suite run completed with ${totalFailed} failure(s).\n`));
    process.exit(1);
  } else {
    console.log(pc.green(`✨ All ${totalPassed} PersonaPlay test suites executed successfully with 100% pass rate!\n`));
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running PersonaPlay test suites:', err);
  process.exit(1);
});
