/**
 * Shannon Entropy Calculator for Path Token Clustering
 */

export class TokenEntropy {
  /**
   * Calculates Shannon Entropy of a string token in bits
   * H(X) = - SUM( P(xi) * log2(P(xi)) )
   */
  static calculate(token: string): number {
    if (!token || token.length === 0) return 0;

    const len = token.length;
    const frequencies: Record<string, number> = {};

    for (let i = 0; i < len; i++) {
      const char = token[i];
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    let entropy = 0;
    for (const char in frequencies) {
      const p = frequencies[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Evaluates whether a token behaves like a high-entropy dynamic identifier / slug / hash
   */
  static isDynamicSlug(token: string, minLength: number = 8, minEntropy: number = 2.8): boolean {
    if (!token || token.length < minLength) return false;

    // Check character variety: contains mix of digits/hex/base64 chars
    const hasDigits = /\d/.test(token);
    const hasLetters = /[a-zA-Z]/.test(token);
    const entropy = this.calculate(token);

    // If both letters and numbers exist and entropy is high, it's a dynamic slug/hash
    if (hasDigits && hasLetters && entropy >= minEntropy) {
      return true;
    }

    // If all hex characters and length >= 12
    if (/^[a-fA-F0-9]{12,}$/.test(token) && entropy >= 2.5) {
      return true;
    }

    return false;
  }
}
