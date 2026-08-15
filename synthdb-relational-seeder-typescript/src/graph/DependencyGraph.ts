/**
 * SynthDB - Table Dependency Graph Builder
 * Directed graph representing table foreign key dependencies.
 */

import { TableDefinition } from '../types';

export interface GraphEdge {
  fromTable: string; // Dependent table (contains the FK)
  toTable: string;   // Referenced parent table
  foreignKeyColumn: string;
  isSelfReferential: boolean;
}

export class DependencyGraph {
  public readonly nodes: Set<string> = new Set();
  // table -> set of tables it directly depends on (prerequisites)
  public readonly dependencies: Map<string, Set<string>> = new Map();
  // table -> set of tables that depend on it
  public readonly dependents: Map<string, Set<string>> = new Map();
  public readonly edges: GraphEdge[] = [];

  constructor(tables: TableDefinition[]) {
    this.buildGraph(tables);
  }

  private buildGraph(tables: TableDefinition[]): void {
    for (const table of tables) {
      const tName = table.name.toLowerCase();
      this.nodes.add(tName);
      if (!this.dependencies.has(tName)) this.dependencies.set(tName, new Set());
      if (!this.dependents.has(tName)) this.dependents.set(tName, new Set());
    }

    for (const table of tables) {
      const fromTable = table.name.toLowerCase();

      // Single column foreign keys
      for (const fk of table.foreignKeys) {
        const toTable = fk.targetTable.toLowerCase();
        const isSelf = fromTable === toTable;

        this.edges.push({
          fromTable,
          toTable,
          foreignKeyColumn: fk.column,
          isSelfReferential: isSelf
        });

        if (!isSelf && this.nodes.has(toTable)) {
          this.dependencies.get(fromTable)!.add(toTable);
          this.dependents.get(toTable)!.add(fromTable);
        }
      }

      // Composite foreign keys
      if (table.compositeForeignKeys) {
        for (const cfk of table.compositeForeignKeys) {
          const toTable = cfk.targetTable.toLowerCase();
          const isSelf = fromTable === toTable;

          if (!isSelf && this.nodes.has(toTable)) {
            this.dependencies.get(fromTable)!.add(toTable);
            this.dependents.get(toTable)!.add(fromTable);
          }
        }
      }
    }
  }

  public getPrerequisites(tableName: string): string[] {
    return Array.from(this.dependencies.get(tableName.toLowerCase()) || []);
  }

  public getDependents(tableName: string): string[] {
    return Array.from(this.dependents.get(tableName.toLowerCase()) || []);
  }
}
