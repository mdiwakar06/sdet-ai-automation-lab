declare module '@playwright/test/reporter' {
  export interface Suite {
    allTests(): TestCase[];
  }
  export interface TestCase {
    title: string;
    id: string;
    titlePath(): string[];
    outcome(): 'skipped' | 'expected' | 'unexpected' | 'flaky';
    location: { file: string; line: number; column: number };
    retries: number;
  }
  export interface TestResult {
    status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
    duration: number;
    error?: { message?: string; stack?: string };
    errors: Array<{ message?: string; stack?: string }>;
    attachments: Array<{
      name: string;
      path?: string;
      body?: Buffer;
      contentType: string;
    }>;
    retry: number;
  }
  export interface FullConfig {
    rootDir: string;
  }
  export interface Reporter {
    onBegin?(config: FullConfig, suite: Suite): void;
    onTestBegin?(test: TestCase, result: TestResult): void;
    onTestEnd?(test: TestCase, result: TestResult): void;
    onEnd?(result: any): void;
    onError?(error: any): void;
  }
}
