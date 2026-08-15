/**
 * SynthDB - NDJSON & CSV Streaming Exporter
 * Exports datasets to individual CSV files and Newline Delimited JSON (.ndjson) fixtures.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TableDataset } from '../types';

export class JsonCsvExporter {
  /**
   * Exports all tables to NDJSON files in target directory.
   */
  public static exportToNdjson(outputDir: string, datasets: Map<string, TableDataset>): string[] {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const exportedFiles: string[] = [];

    for (const [tableName, dataset] of datasets.entries()) {
      const filePath = path.join(outputDir, `${tableName}.ndjson`);
      const lines = dataset.rows.map(row => JSON.stringify(row));
      fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
      exportedFiles.push(filePath);
    }

    return exportedFiles;
  }

  /**
   * Exports all tables to CSV files in target directory.
   */
  public static exportToCsv(outputDir: string, datasets: Map<string, TableDataset>): string[] {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const exportedFiles: string[] = [];

    for (const [tableName, dataset] of datasets.entries()) {
      const filePath = path.join(outputDir, `${tableName}.csv`);
      const header = dataset.columns.map(c => this.escapeCsvField(c)).join(',');
      const rows = dataset.rows.map(row => {
        return dataset.columns.map(c => this.escapeCsvField(row[c])).join(',');
      });

      fs.writeFileSync(filePath, [header, ...rows].join('\n') + '\n', 'utf8');
      exportedFiles.push(filePath);
    }

    return exportedFiles;
  }

  private static escapeCsvField(val: any): string {
    if (val === null || val === undefined) {
      return '';
    }
    if (typeof val === 'object') {
      val = JSON.stringify(val);
    }
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
