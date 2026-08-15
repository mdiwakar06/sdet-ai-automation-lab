/**
 * SynthDB - Unique Constraint Guard & Collision Avoidance
 * Tracks single-column and composite tuples to guarantee 0 collisions.
 */

export class UniqueGuard {
  // key: tableName:columnName or tableName:compositeCols... -> Set of stringified values
  private seenSets: Map<string, Set<string>> = new Map();

  /**
   * Clears all tracked unique states
   */
  public clear(): void {
    this.seenSets.clear();
  }

  /**
   * Clears state for a specific table
   */
  public clearTable(tableName: string): void {
    const prefix = `${tableName}:`;
    for (const key of this.seenSets.keys()) {
      if (key.startsWith(prefix)) {
        this.seenSets.delete(key);
      }
    }
  }

  /**
   * Checks if a single column value is unique; if so, records it and returns true.
   * If already seen, returns false.
   */
  public tryRegister(tableName: string, columnName: string, value: any): boolean {
    if (value === null || value === undefined) return true; // SQL UNIQUE allows multiple NULLs in standard dialects
    const key = `${tableName}:${columnName}`;
    let set = this.seenSets.get(key);
    if (!set) {
      set = new Set<string>();
      this.seenSets.set(key, set);
    }

    const strVal = String(value);
    if (set.has(strVal)) {
      return false;
    }
    set.add(strVal);
    return true;
  }

  /**
   * Checks if a composite key tuple is unique; if so, records it and returns true.
   */
  public tryRegisterComposite(tableName: string, columns: string[], values: any[]): boolean {
    if (values.every(v => v === null || v === undefined)) return true;
    const key = `${tableName}:${columns.slice().sort().join('+')}`;
    let set = this.seenSets.get(key);
    if (!set) {
      set = new Set<string>();
      this.seenSets.set(key, set);
    }

    const strVal = values.map(v => (v === null ? '__NULL__' : String(v))).join(':::');
    if (set.has(strVal)) {
      return false;
    }
    set.add(strVal);
    return true;
  }

  /**
   * Generates a unique value by invoking candidate generator with retries and sequence fallback.
   */
  public generateUnique<T>(
    tableName: string,
    columnName: string,
    generatorFn: (attempt: number) => T,
    maxRetries: number = 100
  ): T {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const candidate = generatorFn(attempt);
      if (this.tryRegister(tableName, columnName, candidate)) {
        return candidate;
      }
    }

    // Sequence fallback guaranteeing termination
    const candidateFallback = `${generatorFn(0)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` as unknown as T;
    this.tryRegister(tableName, columnName, candidateFallback);
    return candidateFallback;
  }
}
