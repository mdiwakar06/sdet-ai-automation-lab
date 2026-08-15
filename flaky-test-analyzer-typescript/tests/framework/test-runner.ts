/**
 * TraceRCA Automated Test Framework
 * Ultra-fast, zero-dependency, strongly-typed test runner with assertion tracking & performance profiling.
 */

import chalk from 'chalk';

export interface TestResultEntry {
  suiteName: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  assertionCount: number;
  error?: Error;
}

export interface SuiteResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalAssertions: number;
  durationMs: number;
  tests: TestResultEntry[];
}

class AssertionContext {
  private count = 0;

  increment(): void {
    this.count++;
  }

  getCount(): number {
    return this.count;
  }

  reset(): void {
    this.count = 0;
  }
}

export const assertionContext = new AssertionContext();

export class Expectation<T> {
  constructor(private actual: T, private isNot = false) {}

  get not(): Expectation<T> {
    const opp = new Expectation(this.actual, !this.isNot);
    return opp;
  }

  toBe(expected: T): void {
    assertionContext.increment();
    const matches = Object.is(this.actual, expected);
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`);
    }
  }

  toEqual(expected: any): void {
    assertionContext.increment();
    const actualStr = JSON.stringify(this.actual);
    const expectedStr = JSON.stringify(expected);
    const matches = actualStr === expectedStr;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected ${actualStr} ${this.isNot ? 'NOT to equal' : 'to equal'} ${expectedStr}`);
    }
  }

  toBeTruthy(): void {
    assertionContext.increment();
    const isTrue = Boolean(this.actual);
    if (this.isNot ? isTrue : !isTrue) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be truthy' : 'to be truthy'}`);
    }
  }

  toBeFalsy(): void {
    assertionContext.increment();
    const isFalse = !Boolean(this.actual);
    if (this.isNot ? isFalse : !isFalse) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be falsy' : 'to be falsy'}`);
    }
  }

  toBeNull(): void {
    assertionContext.increment();
    const isNull = this.actual === null;
    if (this.isNot ? isNull : !isNull) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be null' : 'to be null'}`);
    }
  }

  toBeUndefined(): void {
    assertionContext.increment();
    const isUndef = this.actual === undefined;
    if (this.isNot ? isUndef : !isUndef) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to be undefined' : 'to be undefined'}`);
    }
  }

  toBeDefined(): void {
    assertionContext.increment();
    const isDef = this.actual !== undefined;
    if (this.isNot ? isDef : !isDef) {
      throw new Error(`Expected value ${this.isNot ? 'NOT to be defined' : 'to be defined'}`);
    }
  }

  toContain(item: any): void {
    assertionContext.increment();
    let contains = false;
    if (typeof this.actual === 'string') {
      contains = this.actual.includes(String(item));
    } else if (Array.isArray(this.actual)) {
      contains = this.actual.includes(item);
    } else if (this.actual instanceof Set) {
      contains = this.actual.has(item);
    } else if (this.actual && typeof this.actual === 'object') {
      contains = item in (this.actual as any);
    }
    if (this.isNot ? contains : !contains) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT to contain' : 'to contain'} ${JSON.stringify(item)}`);
    }
  }

  toMatch(pattern: RegExp | string): void {
    assertionContext.increment();
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const matches = regex.test(String(this.actual));
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected "${String(this.actual)}" ${this.isNot ? 'NOT to match' : 'to match'} pattern ${regex}`);
    }
  }

  toBeGreaterThan(expected: number): void {
    assertionContext.increment();
    const passes = (this.actual as any) > expected;
    if (this.isNot ? passes : !passes) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT to be >' : 'to be >'} ${expected}`);
    }
  }

  toBeGreaterThanOrEqual(expected: number): void {
    assertionContext.increment();
    const passes = (this.actual as any) >= expected;
    if (this.isNot ? passes : !passes) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT to be >=' : 'to be >='} ${expected}`);
    }
  }

  toBeLessThan(expected: number): void {
    assertionContext.increment();
    const passes = (this.actual as any) < expected;
    if (this.isNot ? passes : !passes) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT to be <' : 'to be <'} ${expected}`);
    }
  }

  toBeLessThanOrEqual(expected: number): void {
    assertionContext.increment();
    const passes = (this.actual as any) <= expected;
    if (this.isNot ? passes : !passes) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT to be <=' : 'to be <='} ${expected}`);
    }
  }

  toHaveLength(expected: number): void {
    assertionContext.increment();
    const len = (this.actual as any)?.length;
    const matches = len === expected;
    if (this.isNot ? matches : !matches) {
      throw new Error(`Expected length ${len} ${this.isNot ? 'NOT to be' : 'to be'} ${expected}`);
    }
  }

  toThrow(expectedError?: string | RegExp): void {
    assertionContext.increment();
    if (typeof this.actual !== 'function') {
      throw new Error('Expected target to be a function in toThrow assertion');
    }
    let threw = false;
    let thrownError: any = null;
    try {
      (this.actual as any)();
    } catch (err) {
      threw = true;
      thrownError = err;
    }

    if (!threw) {
      if (!this.isNot) {
        throw new Error('Expected function to throw an error, but it did not');
      }
      return;
    }

    if (this.isNot) {
      throw new Error(`Expected function NOT to throw, but it threw: ${thrownError?.message || thrownError}`);
    }

    if (expectedError) {
      const msg = thrownError?.message || String(thrownError);
      if (typeof expectedError === 'string') {
        if (!msg.includes(expectedError)) {
          throw new Error(`Expected error message to contain "${expectedError}", but got "${msg}"`);
        }
      } else if (!expectedError.test(msg)) {
        throw new Error(`Expected error message to match pattern ${expectedError}, but got "${msg}"`);
      }
    }
  }
}

export function expect<T>(actual: T): Expectation<T> {
  return new Expectation(actual);
}

export type TestFn = () => void | Promise<void>;
export type HookFn = () => void | Promise<void>;

interface TestCaseDefinition {
  name: string;
  fn: TestFn;
}

export class TestSuiteRunner {
  private tests: TestCaseDefinition[] = [];
  private beforeAllHooks: HookFn[] = [];
  private afterAllHooks: HookFn[] = [];
  private beforeEachHooks: HookFn[] = [];
  private afterEachHooks: HookFn[] = [];

  constructor(public name: string) {}

  test(name: string, fn: TestFn): void {
    this.tests.push({ name, fn });
  }

  it(name: string, fn: TestFn): void {
    this.test(name, fn);
  }

  beforeAll(fn: HookFn): void {
    this.beforeAllHooks.push(fn);
  }

  afterAll(fn: HookFn): void {
    this.afterAllHooks.push(fn);
  }

  beforeEach(fn: HookFn): void {
    this.beforeEachHooks.push(fn);
  }

  afterEach(fn: HookFn): void {
    this.afterEachHooks.push(fn);
  }

  async run(): Promise<SuiteResult> {
    const suiteStartTime = Date.now();
    const testResults: TestResultEntry[] = [];
    let totalAssertions = 0;
    let passedCount = 0;
    let failedCount = 0;

    console.log(chalk.bold.cyan(`\n● Test Suite: ${this.name}`));

    for (const hook of this.beforeAllHooks) {
      await hook();
    }

    for (const testCase of this.tests) {
      for (const hook of this.beforeEachHooks) {
        await hook();
      }

      assertionContext.reset();
      const testStartTime = Date.now();
      let passed = true;
      let testError: Error | undefined;

      try {
        await testCase.fn();
      } catch (err: any) {
        passed = false;
        testError = err;
      }

      const durationMs = Date.now() - testStartTime;
      const testAssertions = assertionContext.getCount();
      totalAssertions += testAssertions;

      for (const hook of this.afterEachHooks) {
        try {
          await hook();
        } catch (hookErr) {
          console.error(chalk.red(`Error in afterEach hook:`), hookErr);
        }
      }

      if (passed) {
        passedCount++;
        console.log(`  ${chalk.green('✓')} ${chalk.gray(testCase.name)} ${chalk.dim(`(${durationMs}ms, ${testAssertions} assertions)`)}`);
      } else {
        failedCount++;
        console.log(`  ${chalk.red('✗')} ${chalk.bold.red(testCase.name)} ${chalk.dim(`(${durationMs}ms)`)}`);
        if (testError) {
          console.log(`    ${chalk.red(testError.message || String(testError))}`);
          if (testError.stack) {
            const stackLines = testError.stack.split('\n').slice(1, 4).join('\n');
            console.log(chalk.dim(`    ${stackLines}`));
          }
        }
      }

      testResults.push({
        suiteName: this.name,
        testName: testCase.name,
        passed,
        durationMs,
        assertionCount: testAssertions,
        error: testError
      });
    }

    for (const hook of this.afterAllHooks) {
      await hook();
    }

    const totalDurationMs = Date.now() - suiteStartTime;

    return {
      suiteName: this.name,
      totalTests: this.tests.length,
      passedTests: passedCount,
      failedTests: failedCount,
      totalAssertions,
      durationMs: totalDurationMs,
      tests: testResults
    };
  }
}
