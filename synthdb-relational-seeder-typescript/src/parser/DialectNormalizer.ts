/**
 * SynthDB - SQL Dialect Type Normalizer
 * Normalizes Postgres, MySQL, and SQLite data types into generic SchemaIR types.
 */

import { Dialect, NormalizedDataType } from '../types';

export class DialectNormalizer {
  /**
   * Detects SQL dialect from DDL text or returns generic.
   */
  public static detectDialect(ddl: string): Dialect {
    const lower = ddl.toLowerCase();
    if (lower.includes('serial') || lower.includes('timestamptz') || lower.includes('jsonb') || lower.includes('uuid_generate_v4()')) {
      return 'postgres';
    }
    if (lower.includes('auto_increment') || lower.includes('tinyint(1)') || lower.includes('mediumtext') || lower.includes('enum(')) {
      return 'mysql';
    }
    if (lower.includes('autoincrement') || lower.includes('pragma foreign_keys') || lower.includes('without rowid')) {
      return 'sqlite';
    }
    return 'generic';
  }

  /**
   * Normalizes raw SQL type to NormalizedDataType and extracts length/precision/scale.
   */
  public static normalizeType(rawType: string): {
    normalizedType: NormalizedDataType;
    length?: number;
    precision?: number;
    scale?: number;
    isAutoIncrement?: boolean;
    enumValues?: string[];
  } {
    const trimmed = rawType.trim();
    const upper = trimmed.toUpperCase();

    // Check AutoIncrement keywords in type
    if (upper.includes('SERIAL') || upper.includes('BIGSERIAL') || upper.includes('SMALLSERIAL')) {
      return {
        normalizedType: upper.includes('BIGSERIAL') ? 'bigint' : 'integer',
        isAutoIncrement: true
      };
    }

    // ENUM(...)
    const enumMatch = trimmed.match(/ENUM\s*\(([^)]+)\)/i);
    if (enumMatch) {
      const enumValues = enumMatch[1]
        .split(',')
        .map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      return {
        normalizedType: 'enum',
        enumValues
      };
    }

    // Precision & Scale e.g. DECIMAL(10, 2) or NUMERIC(12, 4)
    const precScaleMatch = trimmed.match(/(?:DECIMAL|NUMERIC)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (precScaleMatch) {
      return {
        normalizedType: 'decimal',
        precision: parseInt(precScaleMatch[1], 10),
        scale: parseInt(precScaleMatch[2], 10)
      };
    }

    // Length e.g. VARCHAR(255) or CHAR(36)
    const lenMatch = trimmed.match(/(?:VARCHAR|CHAR|NVARCHAR|CHARACTER VARYING)\s*\(\s*(\d+)\s*\)/i);
    if (lenMatch) {
      const isChar = upper.startsWith('CHAR');
      return {
        normalizedType: isChar ? 'char' : 'varchar',
        length: parseInt(lenMatch[1], 10)
      };
    }

    // UUID
    if (upper.includes('UUID')) {
      return { normalizedType: 'uuid' };
    }

    // JSON / JSONB
    if (upper.includes('JSON')) {
      return { normalizedType: 'json' };
    }

    // Boolean
    if (upper === 'BOOLEAN' || upper === 'BOOL' || upper === 'TINYINT(1)' || upper === 'BIT(1)') {
      return { normalizedType: 'boolean' };
    }

    // Integers
    if (upper.includes('BIGINT') || upper.includes('INT8')) {
      return { normalizedType: 'bigint' };
    }
    if (upper.includes('SMALLINT') || upper.includes('INT2') || upper.includes('TINYINT')) {
      return { normalizedType: 'smallint' };
    }
    if (upper.includes('INT') || upper.includes('INTEGER') || upper.includes('INT4')) {
      return { normalizedType: 'integer' };
    }

    // Floating point
    if (upper.includes('FLOAT') || upper.includes('DOUBLE') || upper.includes('REAL')) {
      return { normalizedType: 'float' };
    }
    if (upper.includes('DECIMAL') || upper.includes('NUMERIC') || upper.includes('MONEY')) {
      return { normalizedType: 'decimal', precision: 10, scale: 2 };
    }

    // Date and Time
    if (upper.includes('TIMESTAMP') || upper.includes('DATETIME') || upper.includes('TIMESTAMPTZ')) {
      return { normalizedType: 'timestamp' };
    }
    if (upper.includes('DATE')) {
      return { normalizedType: 'date' };
    }
    if (upper.includes('TIME')) {
      return { normalizedType: 'time' };
    }

    // Text / Varchar
    if (upper.includes('TEXT') || upper.includes('CLOB')) {
      return { normalizedType: 'text' };
    }
    if (upper.includes('VARCHAR') || upper.includes('STRING')) {
      return { normalizedType: 'varchar', length: 255 };
    }
    if (upper.includes('CHAR')) {
      return { normalizedType: 'char', length: 1 };
    }

    // Binary / Blob / Bytea
    if (upper.includes('BLOB') || upper.includes('BYTEA') || upper.includes('BINARY') || upper.includes('VARBINARY')) {
      return { normalizedType: 'binary' };
    }

    // Default fallback
    return { normalizedType: 'varchar', length: 255 };
  }
}
