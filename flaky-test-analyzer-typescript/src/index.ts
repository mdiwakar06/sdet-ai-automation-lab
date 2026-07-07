#!/usr/bin/env node

/**
 * Flaky Test Analyzer CLI
 * Analyze test results across multiple runs to identify flaky tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { glob } from 'glob';
import { parseFiles } from './parsers';
import { parseTrace } from './parsers/trace';
import { sanitizeContext, loadConfig } from './sanitization/scrubber';
import { analyzeFailure } from './ai/client';
import { analyzeTests } from './analyzer';
import { 
  printConsoleReport, 
  formatJsonReport, 
  writeJsonReport, 
  printTraceRCAReport, 
  generateHtmlReport 
} from './reporters';
import { ReportFormat, TraceRCAReport } from './types';

const program = new Command();

program
  .name('flaky')
  .description('Analyze test results to identify flaky tests')
  .version('1.0.0');

// --- Old Flakiness Analysis Command ---
program
  .command('analyze')
  .description('Analyze test result files for flaky tests')
  .argument('<patterns...>', 'File patterns to analyze (e.g., "results/*.xml" "run-*/report.json")')
  .option('-f, --format <format>', 'Report format: junit, jest, playwright, or auto-detect', undefined)
  .option('-t, --threshold <percent>', 'Flakiness threshold percentage', '10')
  .option('-m, --min-runs <count>', 'Minimum runs required to detect flakiness', '2')
  .option('-n, --top <count>', 'Number of top flaky tests to show', '10')
  .option('-o, --output <format>', 'Output format: console, json', 'console')
  .option('--output-file <path>', 'Write output to file (for json output)')
  .action(async (patterns: string[], options) => {
    try {
      console.log(chalk.gray(`Analyzing test results from: ${patterns.join(', ')}\n`));
      
      // Parse all test result files
      const results = await parseFiles(
        patterns,
        options.format as ReportFormat | undefined
      );
      
      if (results.length === 0) {
        console.log(chalk.yellow('No test results found. Check your file patterns.'));
        process.exit(1);
      }
      
      console.log(chalk.gray(`Found ${results.length} test results\n`));
      
      // Analyze for flakiness
      const analysis = analyzeTests(results, {
        threshold: parseInt(options.threshold, 10),
        minRuns: parseInt(options.minRuns, 10),
        topN: parseInt(options.top, 10),
      });
      
      // Output results
      if (options.output === 'json') {
        if (options.outputFile) {
          writeJsonReport(analysis, options.outputFile);
          console.log(chalk.green(`Report written to: ${options.outputFile}`));
        } else {
          console.log(formatJsonReport(analysis));
        }
      } else {
        printConsoleReport(analysis);
      }
      
      // Exit with error code if flaky tests found
      if (analysis.summary.flakyTests > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('formats')
  .description('List supported test report formats')
  .action(() => {
    console.log(chalk.bold('\nSupported Test Report Formats:\n'));
    
    console.log(chalk.cyan('  junit'));
    console.log(chalk.gray('    JUnit XML format (pytest, JUnit, TestNG, NUnit, etc.)'));
    console.log(chalk.gray('    Files: *.xml\n'));
    
    console.log(chalk.cyan('  jest'));
    console.log(chalk.gray('    Jest JSON reporter output (--json flag)'));
    console.log(chalk.gray('    Files: *.json with Jest structure\n'));
    
    console.log(chalk.cyan('  playwright'));
    console.log(chalk.gray('    Playwright JSON reporter (--reporter=json)'));
    console.log(chalk.gray('    Files: *.json with Playwright structure\n'));
    
    console.log(chalk.gray('Format is auto-detected by default. Use -f to force a specific format.'));
    console.log();
  });

// --- TraceRCA Subcommands ---
const tracerca = program
  .command('tracerca')
  .description('TraceRCA failure analysis and reporting utilities');

tracerca
  .command('analyze')
  .description('Parse trace files, run LLM root-cause analysis, and cache results')
  .argument('<patterns...>', 'Glob patterns for trace zip files (e.g. "**/trace.zip" or "traces/*.zip")')
  .option('-m, --max-analyses <count>', 'Maximum number of Gemini analyses to run', '5')
  .option('-o, --output-dir <path>', 'Directory to save run reports', undefined)
  .action(async (patterns: string[], options) => {
    try {
      const allTraceFiles: string[] = [];
      for (const pattern of patterns) {
        const matched = await glob(pattern);
        allTraceFiles.push(...matched);
      }

      if (allTraceFiles.length === 0) {
        console.log(chalk.yellow('No trace zip files found matching the patterns.'));
        process.exit(1);
      }

      console.log(chalk.gray(`Found ${allTraceFiles.length} trace files. Processing...\n`));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputDir = options.outputDir || path.join(process.cwd(), '.tracerca', 'runs', `run_${timestamp}`);
      fs.mkdirSync(outputDir, { recursive: true });

      const rcaConfig = loadConfig();
      const maxAnalyses = parseInt(options.maxAnalyses, 10);
      let analysisCount = 0;
      const reports: TraceRCAReport[] = [];

      for (const traceFile of allTraceFiles) {
        console.log(chalk.gray(`Processing trace file: ${traceFile}`));
        const testId = path.basename(traceFile, '.zip');
        const testName = testId;

        const rawContext = await parseTrace(traceFile, testId, testName);
        const scrubbedContext = sanitizeContext(rawContext, rcaConfig.sanitization);

        const apiKey = process.env.GEMINI_API_KEY || process.env.TRACERCA_API_KEY;
        let aiAnalysis;
        let analysisError: string | undefined;

        if (apiKey && analysisCount < maxAnalyses) {
          analysisCount++;
          console.log(chalk.cyan(`Running Gemini AI failure analysis for: ${testName}...`));
          try {
            aiAnalysis = await analyzeFailure(scrubbedContext, rcaConfig);
          } catch (err: any) {
            analysisError = err.message || String(err);
            console.error(chalk.red(`[TraceRCA] Gemini analysis failed for ${testName}:`), err);
          }
        }

        const report: TraceRCAReport = {
          testId,
          testName,
          filePath: traceFile,
          timestamp: new Date(),
          rawContext: scrubbedContext,
          aiAnalysis,
          error: analysisError,
        };

        reports.push(report);
        printTraceRCAReport(report);

        // Save individual report to output dir
        const fileName = `${testId.replace(/[^a-z0-9]/gi, '_')}.json`;
        fs.writeFileSync(
          path.join(outputDir, fileName),
          JSON.stringify(report, null, 2),
          'utf-8'
        );
      }

      console.log(chalk.green(`Analysis complete. Cached run results in: ${outputDir}`));
    } catch (error) {
      console.error(chalk.red('Error running TraceRCA analysis:'), error);
      process.exit(1);
    }
  });

tracerca
  .command('report')
  .description('Generate an HTML dashboard report from cached run analyses')
  .argument('[run-dir]', 'Directory of the run to report on (defaults to most recent run)')
  .option('-o, --output <path>', 'HTML report output file path', 'tracerca-report.html')
  .action(async (runDir: string | undefined, options) => {
    try {
      let targetDir = runDir;
      if (!targetDir) {
        targetDir = getMostRecentRunDir();
      }

      if (!targetDir || !fs.existsSync(targetDir)) {
        console.error(chalk.red('Error: No run analysis cache found. Please run a TraceRCA analysis first.'));
        process.exit(1);
      }

      console.log(chalk.gray(`Reading cached analysis reports from: ${targetDir}`));
      const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));

      if (files.length === 0) {
        console.error(chalk.red(`Error: No JSON report files found in: ${targetDir}`));
        process.exit(1);
      }

      const reports: TraceRCAReport[] = [];
      for (const file of files) {
        const filePath = path.join(targetDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
          const parsed = JSON.parse(content) as TraceRCAReport;
          if (parsed.timestamp) {
            parsed.timestamp = new Date(parsed.timestamp);
          }
          reports.push(parsed);
        } catch (e) {
          console.warn(chalk.yellow(`Warning: Failed to parse ${file}: ${e}`));
        }
      }

      const outputPath = path.resolve(options.output);
      console.log(chalk.gray(`Generating interactive HTML dashboard...`));
      generateHtmlReport(reports, outputPath);
      console.log(chalk.green(`✓ HTML dashboard successfully written to: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red('Error generating report:'), error);
      process.exit(1);
    }
  });

/**
 * Local helper to retrieve the path to the most recent run cache directory
 */
function getMostRecentRunDir(): string | undefined {
  const runsParent = path.join(process.cwd(), '.tracerca', 'runs');
  if (!fs.existsSync(runsParent)) return undefined;

  const dirs = fs.readdirSync(runsParent)
    .filter(name => name.startsWith('run_') && fs.statSync(path.join(runsParent, name)).isDirectory())
    .sort();

  if (dirs.length === 0) return undefined;
  return path.join(runsParent, dirs[dirs.length - 1]);
}

// Show help if no command provided
if (process.argv.length < 3) {
  program.help();
}

program.parse();
