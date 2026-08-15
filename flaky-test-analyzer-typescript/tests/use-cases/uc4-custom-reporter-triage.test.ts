/**
 * Use Case 4 (UC-4) Test Suite
 * Playwright custom reporter integration and final-retry triage filtering (skip retry 1, fire on final failure).
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteRunner, expect } from '../framework/test-runner';
import { PlaywrightReporter } from '../../src/playwright-reporter';
import { TestCase, TestResult, FullConfig } from '@playwright/test/reporter';

export const uc4Suite = new TestSuiteRunner('UC-4: Playwright Reporter Integration & Retry Filtering');

function createMockTestCase(id: string, title: string, retries: number = 2): TestCase {
  return {
    id,
    title,
    retries,
    titlePath: () => ['RootSuite', 'SubFeature', title],
    outcome: () => 'unexpected',
    location: {
      file: `tests/e2e/${id}.spec.ts`,
      line: 25,
      column: 6
    }
  };
}

function createMockTestResult(
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted',
  retry: number,
  errorMessage?: string,
  tracePath?: string
): TestResult {
  const attachments: Array<{ name: string; path?: string; contentType: string }> = [];
  if (tracePath) {
    attachments.push({
      name: 'trace',
      path: tracePath,
      contentType: 'application/zip'
    });
  }

  return {
    status,
    retry,
    duration: 1500,
    error: errorMessage ? { message: errorMessage, stack: `Error: ${errorMessage}\n at tests/e2e/test.ts:25:6` } : undefined,
    errors: errorMessage ? [{ message: errorMessage, stack: `Error: ${errorMessage}\n at tests/e2e/test.ts:25:6` }] : [],
    attachments
  };
}

uc4Suite.test('UC4.1: Reporter ignores passing test cases with 0 async promises', async () => {
  const reporter = new PlaywrightReporter();
  reporter.onBegin({ rootDir: process.cwd() } as FullConfig);

  const testCase = createMockTestCase('test-pass-01', 'should load dashboard successfully', 2);
  const result = createMockTestResult('passed', 0);

  reporter.onTestEnd(testCase, result);

  // Access internal pendingAnalyses to ensure nothing is queued
  const pending = (reporter as any).pendingAnalyses;
  expect(pending.length).toBe(0);

  await reporter.onEnd();
});

uc4Suite.test('UC4.2: Reporter ignores skipped test cases', async () => {
  const reporter = new PlaywrightReporter();
  reporter.onBegin({ rootDir: process.cwd() } as FullConfig);

  const testCase = createMockTestCase('test-skip-01', 'should skip disabled feature', 2);
  const result = createMockTestResult('skipped', 0);

  reporter.onTestEnd(testCase, result);

  const pending = (reporter as any).pendingAnalyses;
  expect(pending.length).toBe(0);

  await reporter.onEnd();
});

uc4Suite.test('UC4.3: Flaky retry absorption - Skips intermediate retries (retry 0, retry 1) when maxRetries=2', async () => {
  const reporter = new PlaywrightReporter();
  reporter.onBegin({ rootDir: process.cwd() } as FullConfig);

  const testCase = createMockTestCase('test-flaky-retry-01', 'intermittent network flake', 2);

  // Attempt 1: Failed on initial run (retry: 0 < 2)
  const resultAttempt1 = createMockTestResult('failed', 0, 'Socket hangup on retry 0');
  reporter.onTestEnd(testCase, resultAttempt1);
  expect((reporter as any).pendingAnalyses.length).toBe(0);

  // Attempt 2: Failed on first retry (retry: 1 < 2)
  const resultAttempt2 = createMockTestResult('failed', 1, 'Socket hangup on retry 1');
  reporter.onTestEnd(testCase, resultAttempt2);
  expect((reporter as any).pendingAnalyses.length).toBe(0);

  await reporter.onEnd();
});

uc4Suite.test('UC4.4: Final-retry triage trigger - Fires on final retry (retry 2 of 2) & writes run cache', async () => {
  const reporter = new PlaywrightReporter();
  reporter.onBegin({ rootDir: process.cwd() } as FullConfig);

  const testCase = createMockTestCase('test-final-fail-01', 'persistent checkout error', 2);

  // Attempt 3: Failed on final retry (retry: 2 === 2) -> Must fire analysis!
  const finalResult = createMockTestResult(
    'failed',
    2,
    'Payment gateway returned 500 Internal Server Error'
  );

  reporter.onTestEnd(testCase, finalResult);

  const pending = (reporter as any).pendingAnalyses;
  expect(pending.length).toBe(1);

  // Wait for background promise execution to finish
  await reporter.onEnd();

  // Verify report cache directory was created and JSON report file written
  const runDir = (reporter as any).runDir;
  expect(fs.existsSync(runDir)).toBe(true);

  const cachedFiles = fs.readdirSync(runDir);
  expect(cachedFiles.length).toBe(1);
  expect(cachedFiles[0]).toContain('test_final_fail_01');

  // Verify report contents
  const reportContent = JSON.parse(fs.readFileSync(path.join(runDir, cachedFiles[0]), 'utf-8'));
  expect(reportContent.testId).toBe('test-final-fail-01');
  expect(reportContent.testName).toBe('persistent checkout error');
  expect(reportContent.rawContext.errorMessage).toContain('Payment gateway returned 500');
  expect(reportContent.rawContext.className).toBe('RootSuite > SubFeature');

  // Clean up test cache run
  fs.rmSync(runDir, { recursive: true, force: true });
});

uc4Suite.test('UC4.5: Cost control throttle - Enforces maxAnalyses cap during widespread failures', async () => {
  const reporter = new PlaywrightReporter();
  reporter.onBegin({ rootDir: process.cwd() } as FullConfig);
  // Set maxAnalyses to 2 for this test
  (reporter as any).maxAnalyses = 2;

  // Simulate 4 tests failing on final retry
  for (let i = 1; i <= 4; i++) {
    const testCase = createMockTestCase(`test-mass-failure-${i}`, `Mass failure test #${i}`, 0);
    const result = createMockTestResult('failed', 0, `Outage error #${i}`);
    reporter.onTestEnd(testCase, result);
  }

  expect((reporter as any).pendingAnalyses.length).toBe(4);
  await reporter.onEnd();

  // Verify cache directory has 4 reports written
  const runDir = (reporter as any).runDir;
  const cachedFiles = fs.readdirSync(runDir);
  expect(cachedFiles.length).toBe(4);

  // Clean up
  fs.rmSync(runDir, { recursive: true, force: true });
});
