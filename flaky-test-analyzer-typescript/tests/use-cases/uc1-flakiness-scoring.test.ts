/**
 * Use Case 1 (UC-1) Test Suite
 * Historical flakiness scoring across JUnit/JSON test runs (pass/fail flip rates, severity tiering).
 */

import * as path from 'path';
import { TestSuiteRunner, expect } from '../framework/test-runner';
import { JUnitParser } from '../../src/parsers/junit';
import { PlaywrightParser } from '../../src/parsers/playwright';
import { analyzeTests, getStatusHistoryVisual } from '../../src/analyzer';
import { TestResult, TestStatus } from '../../src/types';

export const uc1Suite = new TestSuiteRunner('UC-1: Historical Flakiness Scoring & Severity Tiering');

uc1Suite.test('UC1.1: Multi-run JUnit XML ingestion and normalization', async () => {
  const parser = new JUnitParser();
  const sampleDir = path.resolve(__dirname, '../../samples');

  const run1Results = await parser.parse(path.join(sampleDir, 'run1-junit.xml'), 'run-1');
  const run2Results = await parser.parse(path.join(sampleDir, 'run2-junit.xml'), 'run-2');
  const run3Results = await parser.parse(path.join(sampleDir, 'run3-junit.xml'), 'run-3');
  const run4Results = await parser.parse(path.join(sampleDir, 'run4-junit.xml'), 'run-4');

  expect(run1Results.length).toBeGreaterThanOrEqual(5);
  expect(run2Results.length).toBeGreaterThanOrEqual(5);
  expect(run3Results.length).toBeGreaterThanOrEqual(5);
  expect(run4Results.length).toBeGreaterThanOrEqual(4);

  // Check structured properties on parsed results
  const timeoutTest = run1Results.find(r => r.testName.includes('network timeout'));
  expect(timeoutTest).toBeDefined();
  expect(timeoutTest?.status).toBe('failed');
  expect(timeoutTest?.errorMessage).toContain('Timeout');
  expect(timeoutTest?.runId).toBe('run-1');
  expect(timeoutTest?.className).toBe('LoginTests');
  expect(timeoutTest?.testId).toBe('LoginTests.should handle network timeout');
  expect(timeoutTest?.duration).toBeGreaterThan(0);
});

uc1Suite.test('UC1.2: Pass/Fail flip rate calculation (100% flakiness vs 0% stable)', () => {
  // Test alternating: passed -> failed -> passed -> failed
  const alternatingRuns: TestResult[] = [
    { testId: 'T1', testName: 'Payment Flake', status: 'passed', runId: 'run-1' },
    { testId: 'T1', testName: 'Payment Flake', status: 'failed', runId: 'run-2' },
    { testId: 'T1', testName: 'Payment Flake', status: 'passed', runId: 'run-3' },
    { testId: 'T1', testName: 'Payment Flake', status: 'failed', runId: 'run-4' },
  ];

  const analysis1 = analyzeTests(alternatingRuns, { threshold: 10, minRuns: 2 });
  expect(analysis1.tests.length).toBe(1);
  const t1 = analysis1.tests[0];
  expect(t1.flakinessScore).toBe(100);
  expect(t1.isFlaky).toBe(true);
  expect(t1.statusTransitions).toBe(3);
  expect(t1.passCount).toBe(2);
  expect(t1.failCount).toBe(2);

  // Test stable passing: passed -> passed -> passed
  const passingRuns: TestResult[] = [
    { testId: 'T2', testName: 'Stable Pass', status: 'passed', runId: 'run-1' },
    { testId: 'T2', testName: 'Stable Pass', status: 'passed', runId: 'run-2' },
    { testId: 'T2', testName: 'Stable Pass', status: 'passed', runId: 'run-3' },
  ];
  const analysis2 = analyzeTests(passingRuns);
  const t2 = analysis2.tests[0];
  expect(t2.flakinessScore).toBe(0);
  expect(t2.isFlaky).toBe(false);
  expect(t2.statusTransitions).toBe(0);
  expect(analysis2.summary.stablePassingTests).toBe(1);

  // Test stable failing: failed -> failed -> failed
  const failingRuns: TestResult[] = [
    { testId: 'T3', testName: 'Stable Broken', status: 'failed', runId: 'run-1' },
    { testId: 'T3', testName: 'Stable Broken', status: 'failed', runId: 'run-2' },
    { testId: 'T3', testName: 'Stable Broken', status: 'error', runId: 'run-3' }, // error normalized to failed
  ];
  const analysis3 = analyzeTests(failingRuns);
  const t3 = analysis3.tests[0];
  expect(t3.flakinessScore).toBe(0);
  expect(t3.isFlaky).toBe(false);
  expect(analysis3.summary.stableFailingTests).toBe(1);
});

uc1Suite.test('UC1.3: Intermediate transition flip rates and skipped run absorption', () => {
  // 4 runs with 1 flip: passed -> passed -> passed -> failed => 1 transition / 3 = 33%
  const oneFlipRuns: TestResult[] = [
    { testId: 'T4', testName: 'Late Regression', status: 'passed', runId: 'run-1' },
    { testId: 'T4', testName: 'Late Regression', status: 'passed', runId: 'run-2' },
    { testId: 'T4', testName: 'Late Regression', status: 'passed', runId: 'run-3' },
    { testId: 'T4', testName: 'Late Regression', status: 'failed', runId: 'run-4' },
  ];
  const analysis4 = analyzeTests(oneFlipRuns);
  expect(analysis4.tests[0].flakinessScore).toBe(33);
  expect(analysis4.tests[0].isFlaky).toBe(true);

  // Skipped runs should not inflate or distort transition scores
  const skippedInterleaved: TestResult[] = [
    { testId: 'T5', testName: 'Skipped Interleaved', status: 'passed', runId: 'run-1' },
    { testId: 'T5', testName: 'Skipped Interleaved', status: 'skipped', runId: 'run-2' },
    { testId: 'T5', testName: 'Skipped Interleaved', status: 'failed', runId: 'run-3' },
    { testId: 'T5', testName: 'Skipped Interleaved', status: 'passed', runId: 'run-4' },
  ];
  const analysis5 = analyzeTests(skippedInterleaved);
  // Relevant statuses: passed -> failed -> passed => 2 transitions / 2 = 100%
  expect(analysis5.tests[0].flakinessScore).toBe(100);
  expect(analysis5.tests[0].skipCount).toBe(1);
});

uc1Suite.test('UC1.4: Severity tiering categorization and top flaky ranking', async () => {
  const parser = new JUnitParser();
  const sampleDir = path.resolve(__dirname, '../../samples');

  const allResults: TestResult[] = [
    ...(await parser.parse(path.join(sampleDir, 'run1-junit.xml'), 'run-1')),
    ...(await parser.parse(path.join(sampleDir, 'run2-junit.xml'), 'run-2')),
    ...(await parser.parse(path.join(sampleDir, 'run3-junit.xml'), 'run-3')),
    ...(await parser.parse(path.join(sampleDir, 'run4-junit.xml'), 'run-4')),
  ];

  const analysis = analyzeTests(allResults, { threshold: 15, topN: 5 });

  expect(analysis.summary.totalTests).toBeGreaterThanOrEqual(4);
  expect(analysis.summary.totalRuns).toBe(4);
  expect(analysis.summary.flakyTests).toBeGreaterThanOrEqual(1);

  // Top flaky should be ordered descending by flakinessScore
  const topFlaky = analysis.summary.topFlaky;
  for (let i = 1; i < topFlaky.length; i++) {
    expect(topFlaky[i - 1].flakinessScore).toBeGreaterThanOrEqual(topFlaky[i].flakinessScore);
  }

  // Check network timeout test flakiness
  const timeoutAnalysis = analysis.tests.find(t => t.testName.includes('network timeout'));
  expect(timeoutAnalysis).toBeDefined();
  expect(timeoutAnalysis?.isFlaky).toBe(true);
  expect(timeoutAnalysis?.flakinessScore).toBeGreaterThanOrEqual(50); // High severity tier
});

uc1Suite.test('UC1.5: Visual status glyph history generation', () => {
  const history1: TestStatus[] = ['passed', 'failed', 'passed', 'skipped', 'error'];
  const visual1 = getStatusHistoryVisual(history1);
  expect(visual1).toBe('✓✗✓○!');

  const history2: TestStatus[] = ['passed', 'passed', 'passed'];
  const visual2 = getStatusHistoryVisual(history2);
  expect(visual2).toBe('✓✓✓');

  const history3: TestStatus[] = ['failed', 'failed', 'error'];
  const visual3 = getStatusHistoryVisual(history3);
  expect(visual3).toBe('✗✗!');
});
