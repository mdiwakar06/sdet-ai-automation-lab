/**
 * SynthDB - Core TypeScript Type Definitions
 */

export type Dialect = 'postgres' | 'mysql' | 'sqlite' | 'generic';

export type ExportFormat = 'sql' | 'sqlite' | 'ndjson' | 'csv' | 'docker' | 'all';

export type NormalizedDataType =
  | 'integer'
  | 'bigint'
  | 'smallint'
  | 'float'
  | 'decimal'
  | 'varchar'
  | 'text'
  | 'char'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'time'
  | 'uuid'
  | 'json'
  | 'enum'
  | 'binary';

export interface ForeignKeyConstraint {
  targetTable: string;
  targetColumn: string;
  sourceColumn?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | string;
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | string;
  isSelfReferential?: boolean;
  isDeferred?: boolean;
  constraintName?: string;
}

export interface CompositeForeignKey {
  targetTable: string;
  sourceColumns: string[];
  targetColumns: string[];
  constraintName?: string;
}

export interface CompositeUniqueConstraint {
  name?: string;
  columns: string[];
}

export interface ColumnDefinition {
  name: string;
  rawType: string;
  normalizedType: NormalizedDataType;
  length?: number;
  precision?: number;
  scale?: number;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: any;
  enumValues?: string[];
  checkConstraint?: string;
  isGenerated?: boolean;
  generationExpression?: string;
  foreignKey?: ForeignKeyConstraint;
  comment?: string;
}

export interface TableDefinition {
  name: string;
  schema?: string;
  columns: ColumnDefinition[];
  primaryKey: string[]; // List of primary key column names (composite if length > 1)
  foreignKeys: Array<{
    column: string;
    targetTable: string;
    targetColumn: string;
    isSelfReferential?: boolean;
    constraintName?: string;
  }>;
  compositeForeignKeys?: CompositeForeignKey[];
  uniqueConstraints: CompositeUniqueConstraint[];
  checkConstraints: string[];
  rowCount?: number;
  comment?: string;
}

export interface SchemaIR {
  dialect: Dialect;
  tables: TableDefinition[];
  rawDdl?: string;
  version?: string;
}

export interface GeneratorOptions {
  seed?: number;
  defaultRowCount?: number;
  rowCountPerTable?: Record<string, number>;
  dialect?: Dialect;
  locale?: string;
  formats?: ExportFormat[];
  outputDir?: string;
  geminiApiKey?: string;
  enableAiSemantics?: boolean;
  verbose?: boolean;
  batchSize?: number;
  nullProbability?: number; // default 0.1 for nullable columns
  zipfAlpha?: number; // default 1.15
}

export interface GeneratedRow {
  [columnName: string]: any;
}

export interface TableDataset {
  tableName: string;
  columns: string[];
  rows: GeneratedRow[];
  pass2Updates?: Array<{
    pkValues: Record<string, any>;
    updateValues: Record<string, any>;
  }>;
}

export interface SyntheticDatabase {
  schema: SchemaIR;
  datasets: Map<string, TableDataset>;
  generationTimeMs: number;
  seed: number;
  cyclesDetected: string[][];
  executionOrder: string[];
  twoPassPlan: Array<{
    tableName: string;
    deferredColumns: string[];
    updateCount: number;
  }>;
}

export interface GenerationSummary {
  seed: number;
  dialect: Dialect;
  totalTables: number;
  totalRows: number;
  durationMs: number;
  throughputRowsPerSec: number;
  tables: Array<{
    name: string;
    rows: number;
    columns: number;
    primaryKeys: string[];
    foreignKeys: number;
    uniqueConstraints: number;
  }>;
  cycles: string[][];
  executionOrder: string[];
  artifacts: string[];
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'STRING_LITERAL'
  | 'NUMERIC_LITERAL'
  | 'SYMBOL'
  | 'OPERATOR'
  | 'COMMENT'
  | 'EOF';
