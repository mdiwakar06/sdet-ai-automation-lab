/**
 * SynthDB - Table Row Synthesizer
 * Orchestrates row generation, foreign key lookups, composite constraints, temporal DAG chains, and 2-pass cyclic plans.
 */

import { Prng } from './Prng';
import { ReferentialPool } from './ReferentialPool';
import { UniqueGuard } from './UniqueGuard';
import { SemanticSynthesizer } from './SemanticSynthesizer';
import { TemporalChain } from './TemporalChain';
import { TableDefinition, GeneratedRow, TableDataset, GeneratorOptions } from '../types';

export class RowSynthesizer {
  private prng: Prng;
  private pool: ReferentialPool;
  private uniqueGuard: UniqueGuard;
  private semanticSynthesizer: SemanticSynthesizer;
  private options: GeneratorOptions;

  constructor(
    prng: Prng,
    pool: ReferentialPool,
    uniqueGuard: UniqueGuard,
    semanticSynthesizer: SemanticSynthesizer,
    options: GeneratorOptions = {}
  ) {
    this.prng = prng;
    this.pool = pool;
    this.uniqueGuard = uniqueGuard;
    this.semanticSynthesizer = semanticSynthesizer;
    this.options = options;
  }

  /**
   * Synthesizes all rows for a table.
   * @param table Table AST definition
   * @param rowCount Number of rows to generate
   * @param deferredColumns Column names deferred to Pass 2 (for cyclic resolution)
   */
  public synthesizeTable(
    table: TableDefinition,
    rowCount: number,
    deferredColumns: string[] = []
  ): TableDataset {
    const tableName = table.name.toLowerCase();
    const rows: GeneratedRow[] = [];
    const pass2Updates: Array<{ pkValues: Record<string, any>; updateValues: Record<string, any> }> = [];

    // Analyze temporal columns
    const temporalNodes = TemporalChain.analyzeTableTemporalColumns(table.columns);

    // Map column lookup
    const deferredSet = new Set(deferredColumns.map(c => c.toLowerCase()));

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const row: GeneratedRow = {};

      // 1. Generate Temporal Chain for the row
      const timestamps = TemporalChain.generateRowTimestamps(temporalNodes, this.prng);
      for (const [colName, val] of Object.entries(timestamps)) {
        row[colName] = val;
      }

      // 2. Handle Composite Foreign Keys first if any
      if (table.compositeForeignKeys && table.compositeForeignKeys.length > 0) {
        for (const cfk of table.compositeForeignKeys) {
          const targetTable = cfk.targetTable.toLowerCase();
          const parentPk = this.pool.sampleCompositeForeignKey(targetTable);
          if (parentPk) {
            cfk.sourceColumns.forEach((srcCol, idx) => {
              const targetCol = cfk.targetColumns[idx];
              if (targetCol && parentPk[targetCol] !== undefined) {
                row[srcCol] = parentPk[targetCol];
              }
            });
          }
        }
      }

      // 3. Generate all other columns
      for (const col of table.columns) {
        const colLower = col.name.toLowerCase();

        // Skip if already populated by temporal chain or composite FK
        if (row[col.name] !== undefined) {
          continue;
        }

        // Check if deferred for cyclic resolution
        if (deferredSet.has(colLower)) {
          row[col.name] = null; // deferred to pass 2
          continue;
        }

        // Check if Single Column Foreign Key
        const fk = table.foreignKeys.find(f => f.column.toLowerCase() === colLower);
        if (fk) {
          const targetTable = fk.targetTable.toLowerCase();

          // Self-referential FK handling (e.g. manager_id, parent_id)
          if (fk.isSelfReferential || targetTable === tableName) {
            // First 20% of rows are root nodes (NULL parent)
            if (rowIndex < Math.max(1, Math.floor(rowCount * 0.2))) {
              row[col.name] = null;
            } else {
              // Pick from previously generated rows in this table
              const selfPks = this.pool.getPrimaryKeys(tableName);
              if (selfPks.length > 0) {
                row[col.name] = this.prng.pick(selfPks);
              } else {
                row[col.name] = null;
              }
            }
            continue;
          }

          // External Foreign Key lookup from ReferentialPool
          // Use Zipfian distribution for high-skew tables (e.g. product_id, user_id)
          const useZipf = colLower.includes('product') || colLower.includes('category') || colLower.includes('user') || colLower.includes('org');
          const sampledFk = this.pool.sampleForeignKey(targetTable, useZipf, this.options.zipfAlpha || 1.15);

          if (sampledFk !== null && sampledFk !== undefined) {
            row[col.name] = sampledFk;
          } else if (col.isNullable) {
            row[col.name] = null;
          } else {
            // Fallback default ID 1 if parent not seeded yet
            row[col.name] = 1;
          }
          continue;
        }

        // Unique Column Generation
        if (col.isUnique || (col.isPrimaryKey && table.primaryKey.length === 1)) {
          const uniqueVal = this.uniqueGuard.generateUnique(
            tableName,
            col.name,
            () => this.semanticSynthesizer.synthesizeColumnValue(table, col, rowIndex, row)
          );
          row[col.name] = uniqueVal;
          continue;
        }

        // Regular Column Generation
        row[col.name] = this.semanticSynthesizer.synthesizeColumnValue(table, col, rowIndex, row);
      }

      // 4. Validate Composite Unique Constraints
      if (table.uniqueConstraints.length > 0) {
        for (const uq of table.uniqueConstraints) {
          if (uq.columns.length > 1) {
            const vals = uq.columns.map(c => row[c]);
            if (!this.uniqueGuard.tryRegisterComposite(tableName, uq.columns, vals)) {
              // Modify one non-FK column to ensure uniqueness
              for (const cName of uq.columns) {
                const cDef = table.columns.find(c => c.name === cName);
                if (cDef && !cDef.foreignKey && !cDef.isPrimaryKey) {
                  row[cName] = `${row[cName]}_${this.prng.nextInt(100, 9999)}`;
                  break;
                }
              }
            }
          }
        }
      }

      // 5. Evaluate Generated / Virtual columns
      for (const col of table.columns) {
        if (col.isGenerated && col.generationExpression) {
          row[col.name] = this.evaluateGeneratedExpression(col.generationExpression, row);
        }
      }

      rows.push(row);
      this.pool.registerRow(tableName, row, table.primaryKey);
    }

    // 6. Plan Pass 2 Updates for deferred cyclic columns
    if (deferredColumns.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const updateVals: Record<string, any> = {};
        const pkVals: Record<string, any> = {};

        for (const pkCol of table.primaryKey) {
          pkVals[pkCol] = row[pkCol];
        }

        for (const defCol of deferredColumns) {
          const fk = table.foreignKeys.find(f => f.column.toLowerCase() === defCol.toLowerCase());
          if (fk) {
            const targetTable = fk.targetTable.toLowerCase();
            const sampled = this.pool.sampleForeignKey(targetTable, false);
            if (sampled !== null && sampled !== undefined) {
              updateVals[fk.column] = sampled;
              // update in-memory row as well
              row[fk.column] = sampled;
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
    }

    return {
      tableName: table.name,
      columns: table.columns.map(c => c.name),
      rows,
      pass2Updates
    };
  }

  /**
   * Evaluates simple arithmetic/string generation expressions
   */
  private evaluateGeneratedExpression(expr: string, row: GeneratedRow): any {
    try {
      // Replace column names with numeric/string values
      let sanitized = expr;
      for (const [col, val] of Object.entries(row)) {
        if (typeof val === 'number') {
          sanitized = sanitized.replace(new RegExp(`\\b${col}\\b`, 'g'), String(val));
        }
      }
      // Safe arithmetic evaluation
      if (/^[0-9\s\+\-\*\/\.\(\)]+$/.test(sanitized)) {
        // eslint-disable-next-line no-eval
        return Number(Function(`"use strict"; return (${sanitized})`)());
      }
    } catch {
      // ignore eval errors and return null
    }
    return null;
  }
}
