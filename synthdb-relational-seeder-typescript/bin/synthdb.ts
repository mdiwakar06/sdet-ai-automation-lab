#!/usr/bin/env node
/**
 * SynthDB - Command Line Interface
 */

import * as fs from 'fs';
import * as path from 'path';
import { SynthDB } from '../src/index';
import { Logger } from '../src/utils/logger';
import { Dialect, ExportFormat } from '../src/types';

let program: any;
try {
  const commander = require('commander');
  program = new commander.Command();
} catch {
  // Graceful fallback
}

if (!program) {
  // Simple fallback arg parsing
  const args = process.argv.slice(2);
  const schemaFile = args.find((_, i) => args[i - 1] === '-s' || args[i - 1] === '--schema') || 'samples/ecommerce.sql';
  const outDir = args.find((_, i) => args[i - 1] === '-o' || args[i - 1] === '--out') || 'output';
  const seed = Number(args.find((_, i) => args[i - 1] === '--seed') || 42);
  const rows = Number(args.find((_, i) => args[i - 1] === '-r' || args[i - 1] === '--rows') || 25);
  const dialect = (args.find((_, i) => args[i - 1] === '-d' || args[i - 1] === '--dialect') || 'postgres') as Dialect;

  runCli({ schema: schemaFile, out: outDir, seed, rows, dialect, formats: 'all', verbose: true });
} else {
  program
    .name('synthdb')
    .description('High-Fidelity Deterministic Relational Synthetic Database Generator and Seeder')
    .version('1.0.0');

  program
    .command('generate', { isDefault: true })
    .description('Generate synthetic relational database from SQL DDL schema')
    .option('-s, --schema <path>', 'Path to SQL DDL schema file', 'samples/ecommerce.sql')
    .option('-o, --out <dir>', 'Output directory for generated artifacts', 'output')
    .option('--seed <number>', 'Deterministic PRNG seed', '42')
    .option('-r, --rows <number>', 'Default row count per table', '25')
    .option('-d, --dialect <dialect>', 'Target SQL dialect (postgres, mysql, sqlite)', 'postgres')
    .option('-f, --formats <formats>', 'Export formats (sql,sqlite,ndjson,csv,docker,all)', 'all')
    .option('--ai', 'Enable Gemini AI semantic vocabulary advisor', false)
    .option('-q, --quiet', 'Suppress terminal summary output', false)
    .option('-v, --verbose', 'Enable verbose debug logging', false)
    .action(async (options: any) => {
      await runCli({
        schema: options.schema,
        out: options.out,
        seed: parseInt(options.seed, 10),
        rows: parseInt(options.rows, 10),
        dialect: options.dialect as Dialect,
        formats: options.formats,
        ai: Boolean(options.ai),
        quiet: Boolean(options.quiet),
        verbose: Boolean(options.verbose)
      });
    });

  program
    .command('report')
    .description('Generate standalone interactive HTML ERD report')
    .requiredOption('-s, --schema <path>', 'Path to SQL DDL schema file')
    .option('-o, --out <path>', 'Output HTML report path', 'reports/synthdb-dashboard.html')
    .action(async (options: any) => {
      const fullPath = path.resolve(process.cwd(), options.schema);
      if (!fs.existsSync(fullPath)) {
        Logger.error(`Schema file not found: ${fullPath}`);
        process.exit(1);
      }
      const ddl = fs.readFileSync(fullPath, 'utf8');
      const outPath = path.resolve(process.cwd(), options.out);
      const engine = new SynthDB({ defaultRowCount: 25, verbose: false });
      const schema = engine.parseDdl(ddl);
      const database = await engine.generate(schema);
      const summary = engine.createSummary(database, [outPath]);
      const { ErdDashboardReporter } = require('../src/index');
      ErdDashboardReporter.generateHtmlReport(database, summary, outPath);
      Logger.success(`Report generated: ${outPath}`);
    });

  program.parse(process.argv);
}

async function runCli(opts: {
  schema: string;
  out: string;
  seed: number;
  rows: number;
  dialect: Dialect;
  formats: string;
  ai?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}) {
  const schemaPath = path.resolve(process.cwd(), opts.schema);
  if (!fs.existsSync(schemaPath)) {
    Logger.error(`Schema DDL file not found: ${schemaPath}`);
    process.exit(1);
  }

  const ddl = fs.readFileSync(schemaPath, 'utf8');
  const formatList = opts.formats.split(',').map(f => f.trim()) as ExportFormat[];

  Logger.setVerbose(Boolean(opts.verbose));
  if (!opts.quiet) {
    Logger.banner('CLI Execution', `Schema: ${opts.schema} | Target: ${opts.dialect}`);
  }

  try {
    await SynthDB.run(ddl, {
      seed: opts.seed,
      defaultRowCount: opts.rows,
      dialect: opts.dialect,
      outputDir: opts.out,
      formats: formatList,
      enableAiSemantics: opts.ai,
      quiet: Boolean(opts.quiet),
      verbose: Boolean(opts.verbose)
    });
  } catch (err: any) {
    Logger.error(`Generation failed: ${err.message}`);
    if (opts.verbose) console.error(err.stack);
    process.exit(1);
  }
}
