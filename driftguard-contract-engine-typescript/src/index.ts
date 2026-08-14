/**
 * DriftGuard - Autonomous API Contract Drift Engine & JSON Schema / OpenAPI 3.1 Comparator
 * Public API & Singleton Entry Point
 */

import { Page, BrowserContext } from 'playwright';
import { OpenApiDocument, HttpRequestRecord, DriftReport, DiffItem, RemediationPatch } from './types';
import { TrafficCollector } from './collector/TrafficCollector';
import { PlaywrightInterceptor } from './collector/PlaywrightInterceptor';
import { HarParser } from './collector/HarParser';
import { PathNormalizer } from './clustering/PathNormalizer';
import { TokenEntropy } from './clustering/TokenEntropy';
import { SchemaInferrer } from './inferrer/SchemaInferrer';
import { OpenApiBuilder } from './inferrer/OpenApiBuilder';
import { DiffEngine } from './diff/DiffEngine';
import { JsonPointer } from './diff/JsonPointer';
import { BREAKING_RULES } from './diff/BreakingRules';
import { RemediationAdvisor } from './ai/RemediationAdvisor';
import { ConsoleReporter } from './reporters/ConsoleReporter';
import { HtmlReporter } from './reporters/HtmlReporter';
import { logger } from './utils/logger';

export * from './types';
export * from './clustering/PathNormalizer';
export * from './clustering/TokenEntropy';
export * from './inferrer/SchemaInferrer';
export * from './inferrer/OpenApiBuilder';
export * from './inferrer/FormatDetector';
export * from './diff/DiffEngine';
export * from './diff/JsonPointer';
export * from './diff/BreakingRules';
export * from './collector/TrafficCollector';
export * from './collector/PlaywrightInterceptor';
export * from './collector/HarParser';
export * from './ai/RemediationAdvisor';
export * from './reporters/ConsoleReporter';
export * from './reporters/HtmlReporter';
export * from './utils/logger';
export * from './utils/piiSanitizer';
export * from './utils/ai';

export class DriftGuard {
  private static instance: DriftGuard;
  private collector: TrafficCollector;
  private advisor: RemediationAdvisor;

  constructor() {
    this.collector = new TrafficCollector();
    this.advisor = new RemediationAdvisor();
  }

  static getInstance(): DriftGuard {
    if (!DriftGuard.instance) {
      DriftGuard.instance = new DriftGuard();
    }
    return DriftGuard.instance;
  }

  /**
   * Attaches zero-overhead network interception to a Playwright page or browser context
   */
  static attach(target: Page | BrowserContext): PlaywrightInterceptor {
    const interceptor = new PlaywrightInterceptor(DriftGuard.getInstance().collector);
    interceptor.attach(target);
    return interceptor;
  }

  /**
   * Directly captures a traffic record into the active collector
   */
  static capture(record: Omit<HttpRequestRecord, 'id' | 'timestamp'>): void {
    DriftGuard.getInstance().collector.capture(record);
  }

  /**
   * Infers an OpenAPI 3.1 document from captured runtime traffic
   */
  static inferFromTraffic(traffic?: HttpRequestRecord[]): OpenApiDocument {
    const records = traffic || DriftGuard.getInstance().collector.getRecords();
    const builder = new OpenApiBuilder();
    return builder.buildFromTraffic(records);
  }

  /**
   * Deep compares a Baseline OpenAPI spec against an Observed OpenAPI spec
   */
  static compare(baseline: OpenApiDocument, observed: OpenApiDocument): DriftReport {
    const engine = new DiffEngine();
    return engine.compare(baseline, observed);
  }

  /**
   * Generates AI/heuristic remediation advice for detected diffs
   */
  static async advise(diffs: DiffItem[]): Promise<RemediationPatch[]> {
    return DriftGuard.getInstance().advisor.advise(diffs);
  }

  /**
   * Prints the drift report to console
   */
  static printReport(report: DriftReport): void {
    ConsoleReporter.print(report);
  }

  /**
   * Exports an interactive HTML dashboard
   */
  static exportHtmlReport(report: DriftReport, outputPath?: string): string {
    return HtmlReporter.generate(report, outputPath);
  }

  /**
   * Returns current collected traffic records
   */
  static getTraffic(): HttpRequestRecord[] {
    return DriftGuard.getInstance().collector.getRecords();
  }

  /**
   * Clears in-memory traffic buffer
   */
  static resetTraffic(): void {
    DriftGuard.getInstance().collector.clear();
  }
}

export default DriftGuard;
