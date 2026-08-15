/**
 * SynthDB - High-Fidelity Deterministic Relational Synthetic Database Generator & Seeder
 * Main Public API and Engine Orchestrator
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Dialect,
  ExportFormat,
  GeneratorOptions,
  GenerationSummary,
  SchemaIR,
  SyntheticDatabase,
  TableDataset,
  TableDefinition
} from './types';
import { DdlParser } from './parser/DdlParser';
import { Prng } from './generator/Prng';
import { ReferentialPool } from './generator/ReferentialPool';
import { UniqueGuard } from './generator/UniqueGuard';
import { SemanticSynthesizer } from './generator/SemanticSynthesizer';
import { RowSynthesizer } from './generator/RowSynthesizer';
import { CycleResolver } from './graph/CycleResolver';
import { ContextualAdvisor } from './ai/ContextualAdvisor';
import { SqlBatchExporter } from './exporters/SqlBatchExporter';
import { SqliteBinaryExporter } from './exporters/SqliteBinaryExporter';
import { JsonCsvExporter } from './exporters/JsonCsvExporter';
import { DockerScaffolder } from './exporters/DockerScaffolder';
import { ConsoleReporter } from './reporters/ConsoleReporter';
import { ErdDashboardReporter } from './reporters/ErdDashboardReporter';
import { Logger } from './utils/logger';

export class SynthDB {
  private options: GeneratorOptions;
  private prng: Prng;
  private pool: ReferentialPool;
  private uniqueGuard: UniqueGuard;

  constructor(options: GeneratorOptions = {}) {
    this.options = {
      seed: options.seed !== undefined ? options.seed : 42,
      defaultRowCount: options.defaultRowCount || 25,
      rowCountPerTable: options.rowCountPerTable || {},
      dialect: options.dialect || 'generic',
      formats: options.formats || ['sql'],
      outputDir: options.outputDir || 'output',
      verbose: options.verbose || false,
      nullProbability: options.nullProbability || 0.05,
      zipfAlpha: options.zipfAlpha || 1.15,
      ...options
    };

    Logger.setVerbose(Boolean(this.options.verbose));
    this.prng = new Prng(this.options.seed);
    this.pool = new ReferentialPool(this.prng);
    this.uniqueGuard = new UniqueGuard();
  }

  /**
   * Parses raw SQL DDL script into SchemaIR AST.
   */
  public parseDdl(ddl: string, dialect?: Dialect): SchemaIR {
    const parser = new DdlParser();
    return parser.parse(ddl, dialect || this.options.dialect);
  }

  /**
   * Generates complete synthetic relational database matching SchemaIR.
   */
  public async generate(schema: SchemaIR): Promise<SyntheticDatabase> {
    const startTime = performance.now();
    this.pool.clear();
    this.uniqueGuard.clear();

    // 1. Resolve Cycles and Topological Insertion Order
    const cycleRes = CycleResolver.resolve(schema.tables);
    const executionOrder = cycleRes.linearizedOrder;

    // 2. AI / Heuristic Domain Advice
    let customVocabularies: Record<string, string[]> = {};
    if (this.options.enableAiSemantics || this.options.geminiApiKey) {
      const advisor = new ContextualAdvisor(this.options.geminiApiKey);
      const advice = await advisor.adviseSchema(schema.tables);
      customVocabularies = advice.domainVocabularies;
    }

    const semanticSynthesizer = new SemanticSynthesizer(this.prng, customVocabularies);
    const rowSynthesizer = new RowSynthesizer(
      this.prng,
      this.pool,
      this.uniqueGuard,
      semanticSynthesizer,
      this.options
    );

    const datasets = new Map<string, TableDataset>();
    const tableMap = new Map<string, TableDefinition>();
    for (const t of schema.tables) {
      tableMap.set(t.name.toLowerCase(), t);
    }

    // 3. Generate tables in topological order (Pass 1)
    const twoPassPlan: Array<{ tableName: string; deferredColumns: string[]; updateCount: number }> = [];

    for (const tableName of executionOrder) {
      const table = tableMap.get(tableName.toLowerCase());
      if (!table) continue;

      // Determine row count for this table
      let rowCount = this.options.defaultRowCount || 25;
      if (typeof this.options.rowCountPerTable === 'number') {
        rowCount = this.options.rowCountPerTable;
      } else if (this.options.rowCountPerTable && this.options.rowCountPerTable[table.name] !== undefined) {
        rowCount = this.options.rowCountPerTable[table.name];
      } else if (table.rowCount) {
        rowCount = table.rowCount;
      }

      // Check if this table has deferred FK columns from cycle plan
      const deferredPlans = cycleRes.deferredFkPlans.filter(p => p.tableName.toLowerCase() === tableName.toLowerCase());
      const deferredCols = deferredPlans.map(p => p.foreignKeyColumn);

      const dataset = rowSynthesizer.synthesizeTable(table, rowCount, deferredCols);
      datasets.set(table.name.toLowerCase(), dataset);
    }

    // 4. Resolve Pass 2 updates now that ALL tables are in memory & registered in ReferentialPool
    for (const [tName, dataset] of datasets.entries()) {
      const table = tableMap.get(tName);
      if (!table) continue;

      const deferredPlans = cycleRes.deferredFkPlans.filter(p => p.tableName.toLowerCase() === tName);
      if (deferredPlans.length === 0) continue;

      const deferredCols = deferredPlans.map(p => p.foreignKeyColumn);
      const pass2Updates: Array<{ pkValues: Record<string, any>; updateValues: Record<string, any> }> = [];

      for (const row of dataset.rows) {
        const updateVals: Record<string, any> = {};
        const pkVals: Record<string, any> = {};

        for (const pkCol of table.primaryKey) {
          pkVals[pkCol] = row[pkCol];
        }

        for (const defCol of deferredCols) {
          const fk = table.foreignKeys.find(f => f.column.toLowerCase() === defCol.toLowerCase());
          if (fk) {
            const targetTable = fk.targetTable.toLowerCase();
            const sampled = this.pool.sampleForeignKey(targetTable, false);
            if (sampled !== null && sampled !== undefined) {
              updateVals[fk.column] = sampled;
              row[fk.column] = sampled; // update in-memory row
            }
          }
        }

        if (Object.keys(updateVals).length > 0) {
          pass2Updates.push({
            pkValues: pkVals,
            updateValues: updateVals
          });
        }
      }

      dataset.pass2Updates = pass2Updates;
      if (pass2Updates.length > 0) {
        twoPassPlan.push({
          tableName: table.name,
          deferredColumns: deferredCols,
          updateCount: pass2Updates.length
        });
      }
    }

    const durationMs = performance.now() - startTime;

    return {
      schema,
      datasets,
      generationTimeMs: durationMs,
      seed: this.options.seed || 42,
      cyclesDetected: cycleRes.stronglyConnectedComponents,
      executionOrder,
      twoPassPlan
    };
  }

  /**
   * Exports generated synthetic database into selected formats.
   */
  public async exportArtifacts(database: SyntheticDatabase): Promise<string[]> {
    const formats = this.options.formats || ['sql'];
    const outDir = this.options.outputDir || 'output';
    const dialect = database.schema.dialect;
    const artifacts: string[] = [];

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const shouldExport = (fmt: ExportFormat) => formats.includes('all') || formats.includes(fmt);

    // 1. SQL Batch Export
    if (shouldExport('sql')) {
      const sqlFile = path.join(outDir, 'synthdb_seed.sql');
      SqlBatchExporter.exportToFile(sqlFile, database.schema, database.datasets, dialect);
      artifacts.push(sqlFile);
    }

    // 2. SQLite Binary Export
    if (shouldExport('sqlite')) {
      const sqliteFile = path.join(outDir, 'synthdb.db');
      const ok = SqliteBinaryExporter.exportToDatabase(sqliteFile, database.schema, database.datasets);
      if (ok) {
        artifacts.push(sqliteFile);
      }
    }

    // 3. NDJSON & CSV Export
    if (shouldExport('ndjson')) {
      const ndjsonDir = path.join(outDir, 'ndjson');
      const files = JsonCsvExporter.exportToNdjson(ndjsonDir, database.datasets);
      artifacts.push(...files);
    }
    if (shouldExport('csv')) {
      const csvDir = path.join(outDir, 'csv');
      const files = JsonCsvExporter.exportToCsv(csvDir, database.datasets);
      artifacts.push(...files);
    }

    // 4. Docker Scaffolding
    if (shouldExport('docker')) {
      const dockerDir = path.join(outDir, 'docker');
      const { composeFile, initSqlFile } = DockerScaffolder.scaffold(dockerDir, database.schema, database.datasets, dialect);
      artifacts.push(composeFile, initSqlFile);
    }

    // 5. HTML ERD Dashboard Report
    const reportHtml = path.join(outDir, 'reports', 'synthdb-dashboard.html');
    const summary = this.createSummary(database, artifacts);
    ErdDashboardReporter.generateHtmlReport(database, summary, reportHtml);
    artifacts.push(reportHtml);

    return artifacts;
  }

  /**
   * Creates execution summary metrics.
   */
  public createSummary(database: SyntheticDatabase, artifacts: string[] = []): GenerationSummary {
    let totalRows = 0;
    const tableSummaries = database.schema.tables.map(t => {
      const ds = database.datasets.get(t.name.toLowerCase());
      const rows = ds ? ds.rows.length : 0;
      totalRows += rows;
      return {
        name: t.name,
        rows,
        columns: t.columns.length,
        primaryKeys: t.primaryKey,
        foreignKeys: t.foreignKeys.length,
        uniqueConstraints: t.uniqueConstraints.length
      };
    });

    const duration = Math.max(0.01, database.generationTimeMs);
    const throughput = (totalRows / duration) * 1000.0;

    return {
      seed: database.seed,
      dialect: database.schema.dialect,
      totalTables: database.schema.tables.length,
      totalRows,
      durationMs: database.generationTimeMs,
      throughputRowsPerSec: throughput,
      tables: tableSummaries,
      cycles: database.cyclesDetected,
      executionOrder: database.executionOrder,
      artifacts
    };
  }

  /**
   * One-stop static runner.
   */
  public static async run(
    ddl: string,
    options: GeneratorOptions = {}
  ): Promise<{ database: SyntheticDatabase; summary: GenerationSummary; artifacts: string[] }> {
    const engine = new SynthDB(options);
    const schema = engine.parseDdl(ddl, options.dialect);
    const database = await engine.generate(schema);
    const artifacts = await engine.exportArtifacts(database);
    const summary = engine.createSummary(database, artifacts);

    if (!options.quiet) {
      ConsoleReporter.printSummary(summary);
    }

    return { database, summary, artifacts };
  }
}

// Export all subsystems
export * from './types';
export * from './parser/SqlLexer';
export * from './parser/DialectNormalizer';
export * from './parser/DdlParser';
export * from './graph/DependencyGraph';
export * from './graph/TopologicalSorter';
export * from './graph/CycleResolver';
export * from './generator/Prng';
export * from './generator/DistributionSampler';
export * from './generator/TemporalChain';
export * from './generator/UniqueGuard';
export * from './generator/ReferentialPool';
export * from './generator/SemanticSynthesizer';
export * from './generator/RowSynthesizer';
export * from './ai/ContextualAdvisor';
export * from './exporters/SqlBatchExporter';
export * from './exporters/SqliteBinaryExporter';
export * from './exporters/JsonCsvExporter';
export * from './exporters/DockerScaffolder';
export * from './reporters/ConsoleReporter';
export * from './reporters/ErdDashboardReporter';
export * from './utils/logger';
export * from './utils/piiPatterns';
export * from './utils/ai';
