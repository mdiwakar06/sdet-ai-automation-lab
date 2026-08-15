/**
 * SynthDB - Deterministic Pure 32-bit Bitwise PRNG (XorShift128+ & SplitMix32)
 */

export class Prng {
  private s0: number = 0;
  private s1: number = 0;
  private s2: number = 0;
  private s3: number = 0;
  private readonly initialSeed: number;

  constructor(seed: number = 42) {
    this.initialSeed = Math.floor(seed);
    this.reseed(this.initialSeed);
  }

  /**
   * Reseeds the PRNG using SplitMix32 to initialize 128-bit internal state.
   */
  public reseed(seed: number): void {
    let s = (seed >>> 0) || 123456789;
    
    // SplitMix32 state initializer
    const splitmix32 = (): number => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };

    this.s0 = splitmix32();
    this.s1 = splitmix32();
    this.s2 = splitmix32();
    this.s3 = splitmix32();
  }

  /**
   * Generates next raw 32-bit unsigned integer using XorShift128+
   */
  public nextUint32(): number {
    const t = (this.s0 ^ (this.s0 << 11)) >>> 0;
    this.s0 = this.s1 >>> 0;
    this.s1 = this.s2 >>> 0;
    this.s2 = this.s3 >>> 0;
    this.s3 = (this.s3 ^ (this.s3 >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
    return (this.s3 + this.s2) >>> 0;
  }

  /**
   * Returns a pseudo-random floating point number in range [0, 1)
   */
  public next(): number {
    return this.nextUint32() / 4294967296.0;
  }

  /**
   * Returns a pseudo-random integer between min and max (inclusive)
   */
  public nextInt(min: number, max: number): number {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const range = hi - lo + 1;
    return lo + Math.floor(this.next() * range);
  }

  /**
   * Returns a pseudo-random float between min and max
   */
  public nextFloat(min: number, max: number, decimals?: number): number {
    const val = min + this.next() * (max - min);
    if (decimals !== undefined && decimals >= 0) {
      return parseFloat(val.toFixed(decimals));
    }
    return val;
  }

  /**
   * Returns a pseudo-random boolean with given probability of true
   */
  public nextBoolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Randomly picks one element from an array
   */
  public pick<T>(array: readonly T[]): T {
    if (!array || array.length === 0) {
      throw new Error('Prng.pick called on empty array');
    }
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Samples k distinct elements from an array (without replacement)
   */
  public sample<T>(array: readonly T[], count: number): T[] {
    if (count <= 0) return [];
    if (count >= array.length) return [...array];

    const copy = [...array];
    const result: T[] = [];
    for (let i = 0; i < count; i++) {
      const idx = this.nextInt(i, copy.length - 1);
      const temp = copy[i];
      copy[i] = copy[idx];
      copy[idx] = temp;
      result.push(copy[i]);
    }
    return result;
  }

  /**
   * Returns a shuffled copy of the input array
   */
  public shuffle<T>(array: readonly T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  public getSeed(): number {
    return this.initialSeed;
  }
}
