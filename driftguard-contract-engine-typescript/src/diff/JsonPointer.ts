/**
 * RFC 6901 JSON Pointer Utility for DriftGuard
 */

export class JsonPointer {
  /**
   * Escapes a single token per RFC 6901 (~ -> ~0, / -> ~1)
   */
  static escape(token: string): string {
    return token.replace(/~/g, '~0').replace(/\//g, '~1');
  }

  /**
   * Unescapes a single token per RFC 6901 (~1 -> /, ~0 -> ~)
   */
  static unescape(token: string): string {
    return token.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  /**
   * Joins segments into an absolute RFC 6901 JSON Pointer string
   */
  static compile(segments: (string | number)[]): string {
    if (segments.length === 0) return '';
    return '/' + segments.map((s) => this.escape(String(s))).join('/');
  }

  /**
   * Splits an RFC 6901 JSON Pointer into decoded tokens
   */
  static parse(pointer: string): string[] {
    if (!pointer || pointer === '/') return [];
    const rawSegments = pointer.startsWith('/') ? pointer.slice(1).split('/') : pointer.split('/');
    return rawSegments.map((s) => this.unescape(s));
  }

  /**
   * Safely retrieves a nested value in an object using an RFC 6901 pointer
   */
  static get(obj: any, pointer: string): any {
    if (!pointer || pointer === '') return obj;
    const tokens = this.parse(pointer);
    let current = obj;

    for (const token of tokens) {
      if (current === null || current === undefined) return undefined;
      current = current[token];
    }

    return current;
  }
}
