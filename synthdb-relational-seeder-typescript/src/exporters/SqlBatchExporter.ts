/**
 * SynthDB - SQL Batch Exporter
 * Generates chunked multi-row INSERT SQL statements with dialect-specific FK headers and 2-pass updates.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Dialect, TableDataset, SchemaIR } from '../types';

export class SqlBatchExporter {
  public static generateSql(
    schema: SchemaIR,
    datasets: Map<string, TableDataset>,
    dialect: Dialect = 'generic',
    batchSize: number = 500
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('-- ====================================================================');
    lines.push(`-- SynthDB Synthetic Database Export (Dialect: ${dialect.toUpperCase()})`);
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('-- ====================================================================\n');

    // FK Disable Header
    lines.push(this.getDisableFkHeader(dialect));

    // Optional DDL Schema creation
    if (schema.rawDdl && schema.dialect === dialect) {
      lines.push('\n-- -------------------------------------------------------------------');
      lines.push('-- DDL Schema Definitions');
      lines.push('-- -------------------------------------------------------------------');
      lines.push(schema.rawDdl.trim() + '\n');
    } else {
      lines.push('\n-- -------------------------------------------------------------------');
      lines.push('-- DDL Schema Definitions');
      lines.push('-- -------------------------------------------------------------------');
      for (const table of schema.tables) {
        const colDefs = table.columns.map(c => {
          let typeStr = 'TEXT';
          if (c.normalizedType === 'integer' || c.normalizedType === 'bigint' || c.normalizedType === 'smallint') typeStr = 'INTEGER';
          if (c.normalizedType === 'float' || c.normalizedType === 'decimal') typeStr = 'REAL';
          if (c.normalizedType === 'boolean') typeStr = 'INTEGER';
          let def = `${this.quoteIdentifier(c.name, dialect)} ${typeStr}`;
          if (c.isPrimaryKey && table.primaryKey.length === 1) def += ' PRIMARY KEY';
          if (!c.isNullable) def += ' NOT NULL';
          return `  ${def}`;
        });
        lines.push(`CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(table.name, dialect)} (\n${colDefs.join(',\n')}\n);\n`);
      }
    }

    // Insert statements per table
    lines.push('-- -------------------------------------------------------------------');
    lines.push('-- Synthetic Data Inserts (Pass 1)');
    lines.push('-- -------------------------------------------------------------------\n');

    for (const [tableName, dataset] of datasets.entries()) {
      if (dataset.rows.length === 0) continue;

      lines.push(`-- Table: ${tableName} (${dataset.rows.length} rows)`);

      // Chunk rows
      for (let i = 0; i < dataset.rows.length; i += batchSize) {
        const batch = dataset.rows.slice(i, i + batchSize);
        const insertStmt = this.buildBatchInsert(tableName, dataset.columns, batch, dialect);
        lines.push(insertStmt);
      }
      lines.push('');
    }

    // Pass 2 Updates (for cyclic / deferred FK relationships)
    const hasPass2 = Array.from(datasets.values()).some(d => d.pass2Updates && d.pass2Updates.length > 0);
    if (hasPass2) {
      lines.push('-- -------------------------------------------------------------------');
      lines.push('-- Cyclic Referential Link Updates (Pass 2)');
      lines.push('-- -------------------------------------------------------------------\n');

      for (const [tableName, dataset] of datasets.entries()) {
        if (!dataset.pass2Updates || dataset.pass2Updates.length === 0) continue;

        lines.push(`-- Pass 2 Updates: ${tableName} (${dataset.pass2Updates.length} updates)`);
        for (const update of dataset.pass2Updates) {
          const updateStmt = this.buildUpdateStatement(tableName, update.pkValues, update.updateValues, dialect);
          lines.push(updateStmt);
        }
        lines.push('');
      }
    }

    // FK Enable Footer
    lines.push(this.getEnableFkFooter(dialect));

    return lines.join('\n');
  }

  public static exportToFile(
    filePath: string,
    schema: SchemaIR,
    datasets: Map<string, TableDataset>,
    dialect: Dialect = 'generic',
    batchSize: number = 500
  ): string {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const sql = this.generateSql(schema, datasets, dialect, batchSize);
    fs.writeFileSync(filePath, sql, 'utf8');
    return filePath;
  }

  private static buildBatchInsert(
    tableName: string,
    columns: string[],
    rows: Array<Record<string, any>>,
    dialect: Dialect
  ): string {
    const quotedTable = this.quoteIdentifier(tableName, dialect);
    const quotedCols = columns.map(c => this.quoteIdentifier(c, dialect)).join(', ');

    const valueTuples = rows.map(row => {
      const vals = columns.map(col => this.formatSqlValue(row[col], dialect));
      return `  (${vals.join(', ')})`;
    });

    return `INSERT INTO ${quotedTable} (${quotedCols})\nVALUES\n${valueTuples.join(',\n')};`;
  }

  private static buildUpdateStatement(
    tableName: string,
    pkValues: Record<string, any>,
    updateValues: Record<string, any>,
    dialect: Dialect
  ): string {
    const quotedTable = this.quoteIdentifier(tableName, dialect);
    const setClauses = Object.entries(updateValues).map(([col, val]) => {
      return `${this.quoteIdentifier(col, dialect)} = ${this.formatSqlValue(val, dialect)}`;
    });

    const whereClauses = Object.entries(pkValues).map(([col, val]) => {
      return `${this.quoteIdentifier(col, dialect)} = ${this.formatSqlValue(val, dialect)}`;
    });

    return `UPDATE ${quotedTable} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`;
  }

  public static formatSqlValue(val: any, dialect: Dialect): string {
    if (val === null || val === undefined) {
      return 'NULL';
    }
    if (typeof val === 'boolean') {
      if (dialect === 'sqlite') return val ? '1' : '0';
      return val ? 'TRUE' : 'FALSE';
    }
    if (typeof val === 'number') {
      return String(val);
    }
    if (typeof val === 'object') {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    }
    // String value - escape single quotes
    const str = String(val).replace(/'/g, "''");
    return `'${str}'`;
  }

  public static quoteIdentifier(id: string, dialect: Dialect): string {
    if (dialect === 'mysql') return `\`${id}\``;
    if (dialect === 'postgres' && (/[A-Z\s-]/.test(id) || ['group', 'table'].includes(id.toLowerCase()))) {
      return `"${id}"`;
    }
    return id;
  }

  private static getDisableFkHeader(dialect: Dialect): string {
    switch (dialect) {
      case 'sqlite':
        return 'PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;';
      case 'mysql':
        return 'SET FOREIGN_KEY_CHECKS = 0;\nSET AUTOCOMMIT = 0;\nSTART TRANSACTION;';
      case 'postgres':
        return 'SET CONSTRAINTS ALL DEFERRED;\nBEGIN;';
      default:
        return 'BEGIN;';
    }
  }

  private static getEnableFkFooter(dialect: Dialect): string {
    switch (dialect) {
      case 'sqlite':
        return 'COMMIT;\nPRAGMA foreign_keys = ON;';
      case 'mysql':
        return 'COMMIT;\nSET FOREIGN_KEY_CHECKS = 1;';
      case 'postgres':
        return 'COMMIT;';
      default:
        return 'COMMIT;';
    }
  }
}
