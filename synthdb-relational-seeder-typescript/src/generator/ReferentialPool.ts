/**
 * SynthDB - Referential Integrity Pool & Reservoir Sampler
 * Tracks generated Primary Keys and row attributes across tables to resolve FK dependencies.
 */

import { Prng } from './Prng';
import { DistributionSampler } from './DistributionSampler';
import { GeneratedRow } from '../types';

export class ReferentialPool {
  // tableName -> Array of generated rows
  private tableRows: Map<string, GeneratedRow[]> = new Map();
  // tableName -> Array of primary key values (for single PK)
  private primaryKeys: Map<string, any[]> = new Map();
  // tableName -> Array of composite PK objects
  private compositePrimaryKeys: Map<string, Record<string, any>[]> = new Map();

  private prng: Prng;
  private sampler: DistributionSampler;

  constructor(prng: Prng) {
    this.prng = prng;
    this.sampler = new DistributionSampler(prng);
  }

  /**
   * Registers a generated row in the pool.
   */
  public registerRow(tableName: string, row: GeneratedRow, pkColumns: string[]): void {
    let rows = this.tableRows.get(tableName);
    if (!rows) {
      rows = [];
      this.tableRows.set(tableName, rows);
    }
    rows.push(row);

    if (pkColumns.length === 1) {
      const pkCol = pkColumns[0];
      const pkVal = row[pkCol];
      let pks = this.primaryKeys.get(tableName);
      if (!pks) {
        pks = [];
        this.primaryKeys.set(tableName, pks);
      }
      pks.push(pkVal);
    } else if (pkColumns.length > 1) {
      const compositePk: Record<string, any> = {};
      for (const pkCol of pkColumns) {
        compositePk[pkCol] = row[pkCol];
      }
      let compPks = this.compositePrimaryKeys.get(tableName);
      if (!compPks) {
        compPks = [];
        this.compositePrimaryKeys.set(tableName, compPks);
      }
      compPks.push(compositePk);
    }
  }

  /**
   * Pre-allocates Primary Keys for a table (crucial for 2-pass cyclic resolution).
   */
  public preallocatePrimaryKeys(tableName: string, pkCol: string, values: any[]): void {
    let pks = this.primaryKeys.get(tableName);
    if (!pks) {
      pks = [];
      this.primaryKeys.set(tableName, pks);
    }
    pks.push(...values);
  }

  /**
   * Samples a random primary key from target table.
   * @param targetTable Table name
   * @param useZipf Whether to use Zipfian distribution (popular items)
   */
  public sampleForeignKey(targetTable: string, useZipf: boolean = false, alpha: number = 1.15): any {
    const pks = this.primaryKeys.get(targetTable);
    if (!pks || pks.length === 0) {
      return null;
    }

    if (useZipf) {
      return this.sampler.zipfianPick(pks, alpha);
    }
    return this.prng.pick(pks);
  }

  /**
   * Samples a composite primary key from target table.
   */
  public sampleCompositeForeignKey(targetTable: string): Record<string, any> | null {
    const compPks = this.compositePrimaryKeys.get(targetTable);
    if (!compPks || compPks.length === 0) {
      return null;
    }
    return this.prng.pick(compPks);
  }

  /**
   * Samples a full parent row to inherit attributes (e.g. tenant_id).
   */
  public sampleParentRow(targetTable: string): GeneratedRow | null {
    const rows = this.tableRows.get(targetTable);
    if (!rows || rows.length === 0) {
      return null;
    }
    return this.prng.pick(rows);
  }

  /**
   * Returns all primary keys generated for a table.
   */
  public getPrimaryKeys(tableName: string): any[] {
    return this.primaryKeys.get(tableName) || [];
  }

  /**
   * Returns all rows generated for a table.
   */
  public getRows(tableName: string): GeneratedRow[] {
    return this.tableRows.get(tableName) || [];
  }

  /**
   * Returns the count of rows generated for a table.
   */
  public getRowCount(tableName: string): number {
    const rows = this.tableRows.get(tableName);
    return rows ? rows.length : (this.primaryKeys.get(tableName)?.length || 0);
  }

  /**
   * Clears the pool.
   */
  public clear(): void {
    this.tableRows.clear();
    this.primaryKeys.clear();
    this.compositePrimaryKeys.clear();
  }
}
