/**
 * SynthDB - Interactive HTML Schema ERD & Synthetic Data Preview Dashboard Reporter
 */

import * as fs from 'fs';
import * as path from 'path';
import { SchemaIR, TableDataset, SyntheticDatabase, GenerationSummary } from '../types';

export class ErdDashboardReporter {
  public static generateHtmlReport(
    database: SyntheticDatabase,
    summary: GenerationSummary,
    outputPath: string = 'reports/synthdb-dashboard.html'
  ): string {
    const templatePath = path.join(__dirname, '../../templates/erd-dashboard.html');
    let template = '';

    if (fs.existsSync(templatePath)) {
      template = fs.readFileSync(templatePath, 'utf8');
    } else {
      // Fallback relative path check
      const altPath = path.resolve(process.cwd(), 'templates/erd-dashboard.html');
      if (fs.existsSync(altPath)) {
        template = fs.readFileSync(altPath, 'utf8');
      } else {
        template = this.getDefaultTemplate();
      }
    }

    const mermaid = this.buildMermaidErDiagram(database.schema);
    const tableSelectOptions = database.schema.tables
      .map(t => `<option value="${t.name.toLowerCase()}">${t.name} (${database.datasets.get(t.name.toLowerCase())?.rows.length || 0} rows)</option>`)
      .join('\n');

    const topologicalPills = database.executionOrder
      .map((t, idx) => `
        <span class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-mono font-medium bg-slate-900 border border-slate-800 text-teal-300">
          <span class="w-4 h-4 rounded-full bg-teal-900/60 text-teal-400 flex items-center justify-center mr-1.5 text-[10px]">${idx + 1}</span>
          ${t}
        </span>
      `).join(' <span class="text-slate-600 font-bold">➔</span> ');

    let cycleDetails = '';
    if (database.cyclesDetected.length === 0 && database.twoPassPlan.length === 0) {
      cycleDetails = `<div class="text-xs text-slate-400">✓ No circular foreign key dependencies detected. Standard 1-pass topological insertion.</div>`;
    } else {
      cycleDetails = `
        <div class="text-xs text-amber-300 font-semibold mb-2">⚠ Cyclic / Self-Referential Dependencies Detected & Resolved:</div>
        <ul class="list-disc list-inside text-xs text-slate-400 space-y-1">
          ${database.cyclesDetected.map(c => `<li>Circular Loop: <strong class="text-amber-400 font-mono">${c.join(' ⇄ ')}</strong></li>`).join('')}
          ${database.twoPassPlan.map(p => `<li>Table <strong class="text-cyan-400 font-mono">${p.tableName}</strong>: Pass 2 Updates for deferred FKs (<span class="font-mono text-slate-300">${p.deferredColumns.join(', ')}</span>)</li>`).join('')}
        </ul>
      `;
    }

    // Limit preview dataset to 100 rows per table to keep HTML responsive
    const previewData: Record<string, { columns: string[]; rows: any[] }> = {};
    for (const [tName, ds] of database.datasets.entries()) {
      previewData[tName] = {
        columns: ds.columns,
        rows: ds.rows.slice(0, 100)
      };
    }

    const totalFks = database.schema.tables.reduce((acc, t) => acc + t.foreignKeys.length, 0);

    const replacements: Record<string, string> = {
      '{{DIALECT}}': database.schema.dialect,
      '{{SEED}}': String(database.seed),
      '{{TOTAL_TABLES}}': String(database.schema.tables.length),
      '{{TOTAL_ROWS}}': summary.totalRows.toLocaleString(),
      '{{TOTAL_FKS}}': String(totalFks),
      '{{CYCLES_COUNT}}': String(database.cyclesDetected.length + database.twoPassPlan.length),
      '{{DURATION_MS}}': summary.durationMs.toFixed(1),
      '{{THROUGHPUT}}': Math.round(summary.throughputRowsPerSec).toLocaleString(),
      '{{MERMAID_DIAGRAM}}': mermaid,
      '{{TABLE_SELECT_OPTIONS}}': tableSelectOptions,
      '{{TOPOLOGICAL_PILLS}}': topologicalPills,
      '{{CYCLE_RESOLUTION_DETAILS}}': cycleDetails,
      '{{RAW_DDL}}': (database.schema.rawDdl || '-- No raw DDL provided').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      '{{DATASETS_JSON}}': JSON.stringify(previewData)
    };

    let renderedHtml = template;
    for (const [key, val] of Object.entries(replacements)) {
      renderedHtml = renderedHtml.split(key).join(val);
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, renderedHtml, 'utf8');

    return outputPath;
  }

  public static buildMermaidErDiagram(schema: SchemaIR): string {
    const lines: string[] = ['erDiagram'];

    // Define table entities
    for (const table of schema.tables) {
      lines.push(`  ${table.name.toUpperCase()} {`);
      for (const col of table.columns) {
        let keyFlag = '';
        if (col.isPrimaryKey) keyFlag = 'PK';
        else if (col.foreignKey) keyFlag = 'FK';
        else if (col.isUnique) keyFlag = 'UK';

        const safeType = col.normalizedType.replace(/[^a-zA-Z0-9]/g, '_');
        const safeName = col.name.replace(/[^a-zA-Z0-9_]/g, '_');
        lines.push(`    ${safeType} ${safeName} ${keyFlag}`.trimEnd());
      }
      lines.push('  }');
    }

    // Define relationships
    for (const table of schema.tables) {
      const fromTable = table.name.toUpperCase();
      for (const fk of table.foreignKeys) {
        const toTable = fk.targetTable.toUpperCase();
        lines.push(`  ${toTable} ||--o{ ${fromTable} : "references"`);
      }
    }

    return lines.join('\n');
  }

  private static getDefaultTemplate(): string {
    return `<!DOCTYPE html><html><head><title>SynthDB Report</title></head><body><h1>SynthDB Report</h1><pre>{{MERMAID_DIAGRAM}}</pre></body></html>`;
  }
}
