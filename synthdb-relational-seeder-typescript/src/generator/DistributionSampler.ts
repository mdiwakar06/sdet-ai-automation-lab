/**
 * SynthDB - Statistical Distribution Samplers
 * Provides Uniform, Gaussian (Normal), and Zipfian (Power-Law) samplers.
 */

import { Prng } from './Prng';

export class DistributionSampler {
  private prng: Prng;

  constructor(prng: Prng) {
    this.prng = prng;
  }

  /**
   * Uniform integer in range [min, max]
   */
  public uniformInt(min: number, max: number): number {
    return this.prng.nextInt(min, max);
  }

  /**
   * Uniform float in range [min, max]
   */
  public uniformFloat(min: number, max: number, decimals?: number): number {
    return this.prng.nextFloat(min, max, decimals);
  }

  /**
   * Gaussian / Normal Distribution using Box-Muller transform
   * @param mean Center of distribution (mu)
   * @param stdDev Standard deviation (sigma)
   * @param min Optional lower clamp
   * @param max Optional upper clamp
   */
  public normal(mean: number, stdDev: number, min?: number, max?: number): number {
    let u1 = this.prng.next();
    let u2 = this.prng.next();

    // Prevent log(0)
    while (u1 === 0) u1 = this.prng.next();
    while (u2 === 0) u2 = this.prng.next();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    let result = mean + z0 * stdDev;

    if (min !== undefined && result < min) result = min;
    if (max !== undefined && result > max) result = max;

    return result;
  }

  /**
   * Normal distribution returning an integer
   */
  public normalInt(mean: number, stdDev: number, min?: number, max?: number): number {
    return Math.round(this.normal(mean, stdDev, min, max));
  }

  /**
   * Zipfian / Power-Law Distribution sampler (Discrete)
   * Samples index in range [0, n - 1] where lower indices are exponentially more probable.
   * Useful for modeling realistic e-commerce SKU popularity, social network followers, etc.
   * @param n Number of items
   * @param alpha Exponent parameter (default 1.15)
   */
  public zipfianIndex(n: number, alpha: number = 1.15): number {
    if (n <= 1) return 0;

    // Calculate generalized harmonic number H(n, alpha)
    let c = 0;
    for (let i = 1; i <= n; i++) {
      c += 1.0 / Math.pow(i, alpha);
    }

    const u = this.prng.next();
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      sum += (1.0 / Math.pow(i, alpha)) / c;
      if (u <= sum) {
        return i - 1; // 0-based index
      }
    }

    return n - 1;
  }

  /**
   * Picks an element from an array according to Zipfian distribution
   */
  public zipfianPick<T>(array: readonly T[], alpha: number = 1.15): T {
    if (!array || array.length === 0) {
      throw new Error('zipfianPick called on empty array');
    }
    const idx = this.zipfianIndex(array.length, alpha);
    return array[idx];
  }

  /**
   * Exponential distribution (modeling inter-arrival times)
   * @param lambda Rate parameter
   */
  public exponential(lambda: number): number {
    let u = this.prng.next();
    while (u === 0) u = this.prng.next();
    return -Math.log(1 - u) / lambda;
  }

  /**
   * Bernoulli distribution with probability p
   */
  public bernoulli(p: number = 0.5): boolean {
    return this.prng.nextBoolean(p);
  }
}
