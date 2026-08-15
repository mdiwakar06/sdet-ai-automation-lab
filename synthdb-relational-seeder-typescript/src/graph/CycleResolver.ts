/**
 * SynthDB - Tarjan's Strongly Connected Components (SCC) & Cycle Resolver
 * Detects circular foreign key dependencies and constructs 2-Pass Update Plans.
 */

import { DependencyGraph } from './DependencyGraph';
import { TableDefinition } from '../types';

export interface DeferredFkPlan {
  tableName: string;
  foreignKeyColumn: string;
  targetTable: string;
  targetColumn: string;
  isSelfReferential: boolean;
}

export interface CycleResolutionResult {
  hasCycles: boolean;
  stronglyConnectedComponents: string[][];
  selfReferentialTables: string[];
  deferredFkPlans: DeferredFkPlan[];
  linearizedOrder: string[];
}

export class CycleResolver {
  /**
   * Tarjan's SCC algorithm on the dependency graph.
   */
  public static findStronglyConnectedComponents(graph: DependencyGraph): string[][] {
    let index = 0;
    const indices: Map<string, number> = new Map();
    const lowlink: Map<string, number> = new Map();
    const onStack: Map<string, boolean> = new Map();
    const stack: string[] = [];
    const sccs: string[][] = [];

    const strongConnect = (v: string) => {
      indices.set(v, index);
      lowlink.set(v, index);
      index++;
      stack.push(v);
      onStack.set(v, true);

      // Consider predecessors (since edges in dependencies represent prerequisite tables)
      const neighbors = graph.dependencies.get(v) || new Set();
      for (const w of neighbors) {
        if (!indices.has(w)) {
          strongConnect(w);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.get(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
        }
      }

      if (lowlink.get(v) === indices.get(v)) {
        const component: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.set(w, false);
          component.push(w);
        } while (w !== v);

        if (component.length > 1) {
          sccs.push(component);
        }
      }
    };

    for (const node of graph.nodes) {
      if (!indices.has(node)) {
        strongConnect(node);
      }
    }

    return sccs;
  }

  /**
   * Resolves cycles by deferring FK columns to pass 2 and returning a valid generation order.
   */
  public static resolve(tables: TableDefinition[]): CycleResolutionResult {
    const tableMap = new Map<string, TableDefinition>();
    for (const t of tables) {
      tableMap.set(t.name.toLowerCase(), t);
    }

    const graph = new DependencyGraph(tables);
    const sccs = this.findStronglyConnectedComponents(graph);
    const deferredFkPlans: DeferredFkPlan[] = [];
    const selfReferentialTables: string[] = [];

    // Check for self-referential tables
    for (const table of tables) {
      const tName = table.name.toLowerCase();
      for (const fk of table.foreignKeys) {
        if (fk.isSelfReferential || fk.targetTable.toLowerCase() === tName) {
          if (!selfReferentialTables.includes(tName)) {
            selfReferentialTables.push(tName);
          }
          deferredFkPlans.push({
            tableName: tName,
            foreignKeyColumn: fk.column,
            targetTable: tName,
            targetColumn: fk.targetColumn,
            isSelfReferential: true
          });
        }
      }
    }

    // For multi-table SCCs, choose the optimal edge to break
    const brokenEdges: Array<{ from: string; to: string; col: string }> = [];

    for (const scc of sccs) {
      // Pick the table with nullable FK to break, or lowest lexicographical
      let broken = false;
      for (const tName of scc) {
        const table = tableMap.get(tName);
        if (!table) continue;

        for (const fk of table.foreignKeys) {
          const target = fk.targetTable.toLowerCase();
          if (scc.includes(target) && target !== tName) {
            const colDef = table.columns.find(c => c.name.toLowerCase() === fk.column.toLowerCase());
            // Nullable column is ideal candidate
            if (colDef && colDef.isNullable) {
              deferredFkPlans.push({
                tableName: tName,
                foreignKeyColumn: fk.column,
                targetTable: target,
                targetColumn: fk.targetColumn,
                isSelfReferential: false
              });
              brokenEdges.push({ from: tName, to: target, col: fk.column });
              broken = true;
              break;
            }
          }
        }
        if (broken) break;
      }

      // If no nullable FK found, break the first edge in cycle
      if (!broken && scc.length > 1) {
        const tName = scc[0];
        const target = scc[1];
        const table = tableMap.get(tName);
        const fk = table?.foreignKeys.find(f => f.targetTable.toLowerCase() === target);
        if (fk) {
          deferredFkPlans.push({
            tableName: tName,
            foreignKeyColumn: fk.column,
            targetTable: target,
            targetColumn: fk.targetColumn,
            isSelfReferential: false
          });
          brokenEdges.push({ from: tName, to: target, col: fk.column });
        }
      }
    }

    // Create an acyclic copy of the tables to compute linearized order
    const acyclicTables: TableDefinition[] = tables.map(t => {
      const copy: TableDefinition = {
        ...t,
        foreignKeys: t.foreignKeys.filter(fk => {
          const from = t.name.toLowerCase();
          const to = fk.targetTable.toLowerCase();
          if (from === to) return false; // ignore self-refs for sorting
          return !brokenEdges.some(be => be.from === from && be.to === to && be.col.toLowerCase() === fk.column.toLowerCase());
        })
      };
      return copy;
    });

    const acyclicGraph = new DependencyGraph(acyclicTables);
    // Simple Kahn's on acyclicGraph
    const inDegree: Map<string, number> = new Map();
    for (const node of acyclicGraph.nodes) {
      inDegree.set(node, acyclicGraph.dependencies.get(node)?.size || 0);
    }

    const queue: string[] = [];
    for (const [node, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(node);
    }
    queue.sort((a, b) => a.localeCompare(b));

    const linearizedOrder: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      linearizedOrder.push(curr);

      const dependents = acyclicGraph.dependents.get(curr) || new Set();
      const ready: string[] = [];
      for (const dep of dependents) {
        const d = inDegree.get(dep)! - 1;
        inDegree.set(dep, d);
        if (d === 0) ready.push(dep);
      }
      if (ready.length > 0) {
        ready.sort((a, b) => a.localeCompare(b));
        for (const r of ready) {
          const idx = queue.findIndex(q => q.localeCompare(r) > 0);
          if (idx === -1) queue.push(r);
          else queue.splice(idx, 0, r);
        }
      }
    }

    // If any tables are still not in linearizedOrder, append them
    for (const t of tables) {
      const lower = t.name.toLowerCase();
      if (!linearizedOrder.includes(lower)) {
        linearizedOrder.push(lower);
      }
    }

    return {
      hasCycles: sccs.length > 0 || selfReferentialTables.length > 0,
      stronglyConnectedComponents: sccs,
      selfReferentialTables,
      deferredFkPlans,
      linearizedOrder
    };
  }
}
