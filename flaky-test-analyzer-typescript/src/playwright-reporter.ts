import * as fs from 'fs';
import * as path from 'path';
import { Reporter, TestCase, TestResult, FullConfig } from '@playwright/test/reporter';
import { parseTrace } from './parsers/trace';
import { sanitizeContext, loadConfig } from './sanitization/scrubber';
import { analyzeFailure } from './ai/client';
import { printTraceRCAReport } from './reporters/console';
import { TraceRCAReport } from './types';

export class PlaywrightReporter implements Reporter {
  private runDir: string;
  private runDirCreated = false;
  private analysisCount = 0;
  private pendingAnalyses: Promise<void>[] = [];
  private maxAnalyses = 5;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.runDir = path.join(process.cwd(), '.tracerca', 'runs', `run_${timestamp}`);
  }

  onBegin(config: FullConfig) {
    const rcaConfig = loadConfig();
    this.maxAnalyses = rcaConfig.analysis?.maxAnalyses ?? 5;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Treat 'failed', 'timedOut', and 'interrupted' as failures
    if (result.status === 'passed' || result.status === 'skipped') {
      return;
    }

    const promise = (async () => {
      try {
        // Find trace zip attachment
        const traceAttachment = result.attachments.find(
          a => a.name === 'trace' || (a.path && a.path.endsWith('.zip'))
        );
        const traceZipPath = traceAttachment?.path;

        // Fallback info from test metadata
        const fallback = {
          className: test.titlePath().slice(0, -1).join(' > '),
          filePath: test.location.file,
          errorMessage: result.error?.message,
          stackTrace: result.error?.stack,
        };

        // Extract raw diagnostics
        const rawContext = await parseTrace(
          traceZipPath || '',
          test.id,
          test.title,
          fallback
        );

        // Scrub the diagnostic context
        const rcaConfig = loadConfig();
        const scrubbedContext = sanitizeContext(rawContext, rcaConfig.sanitization);

        // Call Gemini client if API key is present and count limit has not been reached
        const apiKey = process.env.GEMINI_API_KEY || process.env.TRACERCA_API_KEY;
        let aiAnalysis;
        let analysisError: string | undefined;

        if (apiKey && this.analysisCount < this.maxAnalyses) {
          this.analysisCount++;
          try {
            aiAnalysis = await analyzeFailure(scrubbedContext, rcaConfig);
          } catch (err: any) {
            analysisError = err.message || String(err);
            console.error(`[TraceRCA] Analysis failed for test: ${test.title}`, err);
          }
        }

        const report: TraceRCAReport = {
          testId: test.id,
          testName: test.title,
          filePath: test.location.file,
          timestamp: new Date(),
          rawContext: scrubbedContext,
          aiAnalysis,
          error: analysisError,
        };

        // Print report box to the console
        printTraceRCAReport(report);

        // Write report to cache directory
        const dir = this.getRunDir();
        const fileName = `${test.id.replace(/[^a-z0-9]/gi, '_')}.json`;
        fs.writeFileSync(
          path.join(dir, fileName),
          JSON.stringify(report, null, 2),
          'utf-8'
        );
      } catch (err) {
        console.error(`[TraceRCA] Error processing failure for test: ${test.title}`, err);
      }
    })();

    this.pendingAnalyses.push(promise);
  }

  async onEnd() {
    // Wait for all analyses to complete before finishing
    if (this.pendingAnalyses.length > 0) {
      console.log(`[TraceRCA] Waiting for ${this.pendingAnalyses.length} pending failure analyses to complete...`);
      await Promise.all(this.pendingAnalyses);
      console.log(`[TraceRCA] All failure analyses completed. Cached results in ${this.runDir}`);
    }
  }

  private getRunDir(): string {
    if (!this.runDirCreated) {
      fs.mkdirSync(this.runDir, { recursive: true });
      this.runDirCreated = true;
    }
    return this.runDir;
  }
}

export default PlaywrightReporter;
