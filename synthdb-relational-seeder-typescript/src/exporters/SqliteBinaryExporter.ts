import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import { SchemaIR, TableDataset } from '../types';
import { SqlBatchExporter } from './SqlBatchExporter';
import { Logger } from '../utils/logger';

let Database: any = null;
try {
  Database = require('better-sqlite3');
} catch {
  // Better-sqlite3 might be loaded dynamically
}

export class SqliteBinaryExporter {
  public static exportToDatabase(
    dbFilePath: string,
    schema: SchemaIR,
    datasets: Map<string, TableDataset>
  ): boolean {
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(dbFilePath)) {
      fs.unlinkSync(dbFilePath);
    }

    // Try better-sqlite3 first
    if (Database) {
      try {
        const db = new Database(dbFilePath);
        db.pragma('foreign_keys = OFF');

        // 1. Create Tables DDL
        if (schema.rawDdl) {
          db.exec(schema.rawDdl);
        } else {
          for (const table of schema.tables) {
            const colDefs = table.columns.map(c => {
              let def = `${c.name} ${c.rawType}`;
              if (c.isPrimaryKey && table.primaryKey.length === 1) def += ' PRIMARY KEY';
              if (!c.isNullable) def += ' NOT NULL';
              return def;
            });
            const createSql = `CREATE TABLE IF NOT EXISTS ${table.name} (\n  ${colDefs.join(',\n  ')}\n);`;
            db.exec(createSql);
          }
        }

        // 2. Insert rows in transaction (Pass 1)
        const insertTx = db.transaction(() => {
          for (const [tableName, dataset] of datasets.entries()) {
            if (dataset.rows.length === 0) continue;

            const cols = dataset.columns;
            const placeholders = cols.map(() => '?').join(', ');
            const stmt = db.prepare(`INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`);

            for (const row of dataset.rows) {
              const values = cols.map(c => {
                const v = row[c];
                if (v !== null && typeof v === 'object') return JSON.stringify(v);
                if (typeof v === 'boolean') return v ? 1 : 0;
                return v;
              });
              stmt.run(...values);
            }
          }

          // 3. Pass 2 Updates (if any)
          for (const [tableName, dataset] of datasets.entries()) {
            if (!dataset.pass2Updates || dataset.pass2Updates.length === 0) continue;

            for (const update of dataset.pass2Updates) {
              const setCols = Object.keys(update.updateValues);
              const setClause = setCols.map(c => `${c} = ?`).join(', ');
              const pkCols = Object.keys(update.pkValues);
              const whereClause = pkCols.map(c => `${c} = ?`).join(' AND ');

              const stmt = db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`);
              const params = [
                ...setCols.map(c => update.updateValues[c]),
                ...pkCols.map(c => update.pkValues[c])
              ];
              stmt.run(...params);
            }
          }
        });

        insertTx();
        db.pragma('foreign_keys = ON');
        db.close();

        Logger.debug(`SQLite binary database successfully created at: ${dbFilePath}`);
        return true;
      } catch (err: any) {
        Logger.debug(`better-sqlite3 failed (${err.message}), attempting system sqlite3 fallback...`);
      }
    }

    // Fallback to system sqlite3 CLI
    try {
      const sql = SqlBatchExporter.generateSql(schema, datasets, 'sqlite');
      childProcess.execFileSync('sqlite3', [dbFilePath], { input: sql, stdio: ['pipe', 'ignore', 'ignore'] });
      if (fs.existsSync(dbFilePath)) {
        Logger.debug(`SQLite database created via sqlite3 CLI at: ${dbFilePath}`);
        return true;
      }
    } catch {
      // Fallback failed
    }

    Logger.warn('SQLite binary export could not be performed natively.');
    return false;
  }
}
