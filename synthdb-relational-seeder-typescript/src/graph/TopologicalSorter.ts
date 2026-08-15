/**
 * SynthDB - Deterministic Kahn's Topological Sorter
 * Orders tables by dependency prerequisites with alphabetical tie-breaking on zero in-degree candidate nodes.
 */

import { DependencyGraph } from './DependencyGraph';

export interface TopologicalSortResult {
  order: string[];
  isCyclic: boolean;
  unresolvedTables: string[];
}

export class TopologicalSorter {
  /**
   * Performs Kahn's algorithm with deterministic tie-breaking.
   */
  public static sort(graph: DependencyGraph): TopologicalSortResult {
    // in-degree = count of prerequisite dependencies each node has
    const inDegree: Map<string, number> = new Map();
    for (const node of graph.nodes) {
      inDegree.set(node, graph.dependencies.get(node)?.size || 0);
    }

    // Candidate queue: nodes with in-degree 0 (no prerequisites)
    const zeroInDegreeQueue: string[] = [];
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        zeroInDegreeQueue.push(node);
      }
    }

    // Alphabetical tie-breaking
    zeroInDegreeQueue.sort((a, b) => a.localeCompare(b));

    const sortedOrder: string[] = [];

    while (zeroInDegreeQueue.length > 0) {
      // Dequeue first deterministic candidate
      const current = zeroInDegreeQueue.shift()!;
      sortedOrder.push(current);

      // Decrement in-degree for dependents
      const dependents = graph.dependents.get(current) || new Set();
      const newlyReady: string[] = [];

      for (const dependent of dependents) {
        const currentDegree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, currentDegree);

        if (currentDegree === 0) {
          newlyReady.push(dependent);
        }
      }

      if (newlyReady.length > 0) {
        newlyReady.sort((a, b) => a.localeCompare(b));
        // Insert into queue preserving alphabetical order
        for (const item of newlyReady) {
          const insertIdx = zeroInDegreeQueue.findIndex(q => q.localeCompare(item) > 0);
          if (insertIdx === -1) {
            zeroInDegreeQueue.push(item);
          } else {
            zeroInDegreeQueue.splice(insertIdx, 0, item);
          }
        }
      }
    }

    const isCyclic = sortedOrder.length < graph.nodes.size;
    const unresolvedTables = Array.from(graph.nodes).filter(n => !sortedOrder.includes(n));

    return {
      order: sortedOrder,
      isCyclic,
      unresolvedTables
    };
  }
}
