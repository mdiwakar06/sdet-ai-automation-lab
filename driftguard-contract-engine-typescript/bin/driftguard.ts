#!/usr/bin/env node

/**
 * DriftGuard CLI Entry Point
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { DiffEngine } from '../src/diff/DiffEngine';
import { SchemaInferrer } from '../src/inferrer/SchemaInferrer';
import { OpenApiBuilder } from '../src/inferrer/OpenApiBuilder';
import { HarParser } from '../src/collector/HarParser';
import { RemediationAdvisor } from '../src/ai/RemediationAdvisor';
import { ConsoleReporter } from '../src/reporters/ConsoleReporter';
import { HtmlReporter } from '../src/reporters/HtmlReporter';
import { logger } from '../src/utils/logger';
import { OpenApiDocument, HttpRequestRecord, DriftReport } from '../src/types';

const program = new Command();

program
  .name('driftguard')
  .description('Autonomous API Contract Drift Engine & JSON Schema / OpenAPI 3.1 Comparator')
  .version('1.0.0');

// Command 1: diff
program
  .command('diff')
  .description('Compare baseline OpenAPI spec against observed OpenAPI spec')
  .argument('<baseline>', 'Path to baseline OpenAPI 3.1 JSON file')
  .argument('<observed>', 'Path to observed OpenAPI 3.1 JSON file')
  .option('-h, --html <path>', 'Output path for interactive HTML dashboard')
  .option('-j, --json <path>', 'Output path for raw JSON drift report')
  .option('--ai', 'Enable AI-powered remediation advice via Gemini')
  .option('--no-fail-on-breaking', 'Do not exit with non-zero code if critical breaking changes exist')
  .action(async (baselinePath, observedPath, options) => {
    try {
      if (!fs.existsSync(baselinePath)) {
        logger.error(`Baseline spec file not found: ${baselinePath}`);
        process.exit(1);
      }
      if (!fs.existsSync(observedPath)) {
        logger.error(`Observed spec file not found: ${observedPath}`);
        process.exit(1);
      }

      const baseline: OpenApiDocument = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      const observed: OpenApiDocument = JSON.parse(fs.readFileSync(observedPath, 'utf-8'));

      logger.info(`Analyzing contract differences between ${baselinePath} and ${observedPath}...`);
      const engine = new DiffEngine();
      const report = engine.compare(baseline, observed);

      if (options.ai) {
        logger.info('Querying AI Remediation Advisor for actionable patches...');
        const advisor = new RemediationAdvisor();
        report.remediationPatches = await advisor.advise(report.diffs);
      }

      ConsoleReporter.print(report);

      if (options.html) {
        HtmlReporter.generate(report, options.html);
        logger.success(`Interactive HTML Drift Dashboard written to: ${options.html}`);
      }

      if (options.json) {
        fs.writeFileSync(options.json, JSON.stringify(report, null, 2), 'utf-8');
        logger.success(`JSON Drift report saved to: ${options.json}`);
      }

      if (options.failOnBreaking && report.summary.isContractBroken) {
        logger.critical(`Contract validation failed with ${report.summary.criticalBreakingCount} breaking changes.`);
        process.exit(1);
      }
    } catch (err: any) {
      logger.error(`DriftGuard diff error: ${err.message}`);
      process.exit(1);
    }
  });

// Command 2: infer
program
  .command('infer')
  .description('Infer OpenAPI 3.1 spec from captured traffic or HAR file')
  .argument('<input>', 'Path to JSON traffic file or HAR archive')
  .option('-o, --output <path>', 'Output path for generated OpenAPI spec', 'inferred-openapi.json')
  .option('--title <title>', 'API Title', 'Inferred API Specification')
  .action((inputPath, options) => {
    try {
      if (!fs.existsSync(inputPath)) {
        logger.error(`Input file not found: ${inputPath}`);
        process.exit(1);
      }

      const raw = fs.readFileSync(inputPath, 'utf-8');
      let records: HttpRequestRecord[] = [];

      if (inputPath.endsWith('.har')) {
        logger.info(`Parsing HAR archive: ${inputPath}`);
        records = HarParser.parse(raw);
      } else {
        const parsed = JSON.parse(raw);
        records = Array.isArray(parsed) ? parsed : HarParser.parse(parsed);
      }

      logger.info(`Inferring OpenAPI 3.1 contract from ${records.length} captured request/response cycles...`);
      const builder = new OpenApiBuilder({ title: options.title });
      const spec = builder.buildFromTraffic(records);

      fs.writeFileSync(options.output, JSON.stringify(spec, null, 2), 'utf-8');
      logger.success(`OpenAPI 3.1 specification generated successfully: ${options.output}`);
    } catch (err: any) {
      logger.error(`Inference failed: ${err.message}`);
      process.exit(1);
    }
  });

// Command 3: report
program
  .command('report')
  .description('Generate HTML report from an existing JSON drift report')
  .argument('<reportJson>', 'Path to JSON drift report file')
  .option('-o, --output <path>', 'Output HTML path', 'drift-report.html')
  .action((reportJsonPath, options) => {
    try {
      if (!fs.existsSync(reportJsonPath)) {
        logger.error(`Report JSON file not found: ${reportJsonPath}`);
        process.exit(1);
      }

      const report: DriftReport = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8'));
      HtmlReporter.generate(report, options.output);
      logger.success(`HTML report generated: ${options.output}`);
    } catch (err: any) {
      logger.error(`Report generation failed: ${err.message}`);
      process.exit(1);
    }
  });

// Command 4: update
program
  .command('update')
  .description('Update baseline specification by incorporating non-breaking additions from observed spec')
  .argument('<baseline>', 'Path to baseline OpenAPI JSON file')
  .argument('<observed>', 'Path to observed OpenAPI JSON file')
  .option('-o, --output <path>', 'Path for updated baseline spec')
  .action((baselinePath, observedPath, options) => {
    try {
      const baseline: OpenApiDocument = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      const observed: OpenApiDocument = JSON.parse(fs.readFileSync(observedPath, 'utf-8'));

      const merged: OpenApiDocument = {
        ...baseline,
        paths: {
          ...baseline.paths,
          ...observed.paths,
        },
      };

      const outPath = options.output || baselinePath;
      fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf-8');
      logger.success(`Baseline spec updated with non-breaking additions: ${outPath}`);
    } catch (err: any) {
      logger.error(`Failed to update baseline spec: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
