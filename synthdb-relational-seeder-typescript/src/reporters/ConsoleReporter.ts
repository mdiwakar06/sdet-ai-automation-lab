/**
 * SynthDB - Console Execution Reporter
 * Prints colorful terminal progress summaries, topological execution orders, and performance throughput.
 */

import { Logger } from '../utils/logger';
import { GenerationSummary } from '../types';

let pc: any;
try {
  pc = require('picocolors');
} catch {
  const id = (s: any) => String(s);
  pc = { cyan: id, green: id, yellow: id, blue: id, magenta: id, bold: id, dim: id, gray: id };
}

export class ConsoleReporter {
  public static printSummary(summary: GenerationSummary): void {
    Logger.banner('Synthetic Generation Summary', `Seed: ${summary.seed} | Dialect: ${summary.dialect.toUpperCase()}`);

    // Table rows
    const headers = ['Table Name', 'Rows', 'Columns', 'Primary Key', 'FK References', 'Unique Rules'];
    const rows = summary.tables.map(t => [
      t.name,
      t.rows.toLocaleString(),
      t.columns,
      t.primaryKeys.join(', ') || '(none)',
      t.foreignKeys,
      t.uniqueConstraints
    ]);

    Logger.tableSummary(headers, rows);

    console.log('');
    console.log(pc.bold(pc.cyan('⚡ Execution Metrics:')));
    console.log(`  • Total Tables:          ${pc.bold(pc.green(summary.totalTables))}`);
    console.log(`  • Total Rows Generated:  ${pc.bold(pc.green(summary.totalRows.toLocaleString()))}`);
    console.log(`  • Generation Duration:   ${pc.bold(pc.cyan(summary.durationMs.toFixed(2) + ' ms'))}`);
    console.log(`  • Throughput:            ${pc.bold(pc.green(Math.round(summary.throughputRowsPerSec).toLocaleString() + ' rows/sec'))}`);

    if (summary.cycles.length > 0) {
      console.log(`\n  • ${pc.bold(pc.yellow('Cycles Resolved (2-Pass Plan):'))}`);
      for (const cycle of summary.cycles) {
        console.log(`    - ${pc.yellow(cycle.join(' ⇄ '))}`);
      }
    }

    console.log(`\n  • Topological Insertion Order:`);
    console.log(`    ${pc.magenta(summary.executionOrder.join(' ➔ '))}`);

    if (summary.artifacts.length > 0) {
      console.log(`\n  • Generated Artifacts:`);
      for (const artifact of summary.artifacts) {
        console.log(`    📁 ${pc.cyan(artifact)}`);
      }
    }
    console.log('');
  }
}
