/**
 * SynthDB - Temporal DAG Chain Enforcer
 * Enforces strictly chronological temporal relationships within records:
 * created_at <= updated_at <= verified_at <= shipped_at <= delivered_at <= deleted_at
 */

import { Prng } from './Prng';
import { ColumnDefinition } from '../types';

export interface TemporalNode {
  columnName: string;
  rank: number;
  minDeltaSeconds: number;
  maxDeltaSeconds: number;
  optionalProbability?: number;
}

export class TemporalChain {
  // Chronological hierarchy of common timestamp / date field patterns
  private static readonly TEMPORAL_RANKS: Array<{ pattern: RegExp; rank: number; minSec: number; maxSec: number; prob?: number }> = [
    { pattern: /birth/i, rank: 10, minSec: 0, maxSec: 0 },
    { pattern: /hire|start|enrolled|registered|signup|opened/i, rank: 20, minSec: 86400 * 365 * 18, maxSec: 86400 * 365 * 40 },
    { pattern: /created|inserted|occurred|ordered|requested|placed/i, rank: 30, minSec: 0, maxSec: 0 },
    { pattern: /confirmed|approved|paid|verified|authorized|accepted/i, rank: 40, minSec: 60, maxSec: 86400 * 2, prob: 0.9 },
    { pattern: /processed|packaged|prepared/i, rank: 50, minSec: 300, maxSec: 86400 * 3, prob: 0.85 },
    { pattern: /shipped|dispatched|sent|broadcasted/i, rank: 60, minSec: 1800, maxSec: 86400 * 5, prob: 0.8 },
    { pattern: /delivered|received|arrived|completed|fulfilled/i, rank: 70, minSec: 86400, maxSec: 86400 * 10, prob: 0.75 },
    { pattern: /updated|modified|last_activity|edited/i, rank: 80, minSec: 60, maxSec: 86400 * 30, prob: 0.95 },
    { pattern: /refunded|returned|canceled|cancelled|rejected|failed/i, rank: 90, minSec: 3600, maxSec: 86400 * 60, prob: 0.15 },
    { pattern: /expired|ends?_at|valid_until|due_date/i, rank: 95, minSec: 86400 * 30, maxSec: 86400 * 365, prob: 0.9 },
    { pattern: /deleted|archived|closed|terminated|revoked|soft_deleted/i, rank: 100, minSec: 86400 * 7, maxSec: 86400 * 180, prob: 0.08 }
  ];

  /**
   * Identifies temporal columns in a table and orders them in a causal chain.
   */
  public static analyzeTableTemporalColumns(columns: ColumnDefinition[]): TemporalNode[] {
    const temporalNodes: TemporalNode[] = [];

    for (const col of columns) {
      if (col.normalizedType !== 'timestamp' && col.normalizedType !== 'date') {
        continue;
      }

      let matchedRank = 30; // default created rank
      let minSec = 0;
      let maxSec = 86400 * 14;
      let prob: number | undefined = col.isNullable ? 0.5 : 1.0;

      for (const rule of this.TEMPORAL_RANKS) {
        if (rule.pattern.test(col.name)) {
          matchedRank = rule.rank;
          minSec = rule.minSec;
          maxSec = rule.maxSec;
          if (rule.prob !== undefined && col.isNullable) {
            prob = rule.prob;
          }
          break;
        }
      }

      temporalNodes.push({
        columnName: col.name,
        rank: matchedRank,
        minDeltaSeconds: minSec,
        maxDeltaSeconds: maxSec,
        optionalProbability: col.isNullable ? prob : 1.0
      });
    }

    // Sort by rank ascending
    return temporalNodes.sort((a, b) => a.rank - b.rank);
  }

  /**
   * Generates a coherent chain of timestamp / date values for a row.
   */
  public static generateRowTimestamps(
    nodes: TemporalNode[],
    prng: Prng,
    baseYearRange: { minYear: number; maxYear: number } = { minYear: 2022, maxYear: 2024 }
  ): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    if (nodes.length === 0) return result;

    // Anchor time: random date within baseYearRange
    const startEpoch = new Date(baseYearRange.minYear, 0, 1).getTime();
    const endEpoch = new Date(baseYearRange.maxYear, 11, 31).getTime();
    let currentEpoch = prng.nextInt(startEpoch, endEpoch);

    // If there is a birth date, set it earlier
    const birthNode = nodes.find(n => n.rank === 10);
    if (birthNode) {
      const birthEpoch = new Date(prng.nextInt(1965, 2002), prng.nextInt(0, 11), prng.nextInt(1, 28)).getTime();
      result[birthNode.columnName] = this.formatDate(new Date(birthEpoch));
    }

    for (const node of nodes) {
      if (node.rank === 10) continue; // already handled

      // Check optional probability
      if (node.optionalProbability !== undefined && node.optionalProbability < 1.0) {
        if (!prng.nextBoolean(node.optionalProbability)) {
          result[node.columnName] = null;
          continue;
        }
      }

      // Add delta
      const deltaSec = prng.nextInt(node.minDeltaSeconds, Math.max(node.minDeltaSeconds + 1, node.maxDeltaSeconds));
      currentEpoch += deltaSec * 1000;

      const dateObj = new Date(currentEpoch);
      result[node.columnName] = this.formatDateTime(dateObj);
    }

    return result;
  }

  public static formatDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getUTCFullYear();
    const m = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    const hh = pad(date.getUTCHours());
    const mm = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  public static formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getUTCFullYear();
    const m = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    return `${y}-${m}-${d}`;
  }
}
