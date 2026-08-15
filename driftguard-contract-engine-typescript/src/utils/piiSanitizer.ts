/**
 * PII and Sensitive Data Scrubber for DriftGuard
 */

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'proxy-authorization',
  'token',
  'access-token',
  'secret',
  'x-auth-token',
]);

const SENSITIVE_FIELD_NAMES = new RegExp(
  '^(password|passwd|secret|token|accessToken|refreshToken|apiKey|auth|cvv|cvc|ssn|socialSecurity|creditCard|cardNumber)$',
  'i'
);

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;

export class PiiSanitizer {
  /**
   * Masks sensitive HTTP headers
   */
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      const lower = k.toLowerCase();
      if (SENSITIVE_HEADER_KEYS.has(lower)) {
        sanitized[k] = '[REDACTED_SECRET]';
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  /**
   * Recursively traverses and sanitizes payload bodies (JSON objects, arrays, strings)
   */
  static sanitizePayload(payload: any): any {
    if (payload === null || payload === undefined) {
      return payload;
    }

    if (typeof payload === 'string') {
      return this.sanitizeString(payload);
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.sanitizePayload(item));
    }

    if (typeof payload === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(payload)) {
        if (SENSITIVE_FIELD_NAMES.test(key)) {
          result[key] = '[REDACTED_FIELD]';
        } else {
          result[key] = this.sanitizePayload(value);
        }
      }
      return result;
    }

    return payload;
  }

  private static sanitizeString(str: string): string {
    return str
      .replace(CREDIT_CARD_REGEX, '****-****-****-****')
      .replace(SSN_REGEX, '***-**-****')
      .replace(EMAIL_REGEX, 'user_***@masked.com');
  }
}
