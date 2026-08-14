/**
 * Non-Blocking Circular Traffic Collector & In-Memory Buffer
 */

import { HttpRequestRecord, TrafficCollectorOptions } from '../types/traffic';
import { PathNormalizer } from '../clustering/PathNormalizer';
import { PiiSanitizer } from '../utils/piiSanitizer';

const STATIC_EXTENSION_REGEX = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|mp4|webm|mp3)$/i;

export class TrafficCollector {
  private buffer: HttpRequestRecord[] = [];
  private maxCapacity: number;
  private excludeStaticAssets: boolean;
  private sanitizePii: boolean;
  private ignoredPathPatterns: (RegExp | string)[];

  constructor(options: TrafficCollectorOptions = {}) {
    this.maxCapacity = options.maxBufferSize || 10000;
    this.excludeStaticAssets = options.excludeStaticAssets ?? true;
    this.sanitizePii = options.sanitizePii ?? true;
    this.ignoredPathPatterns = options.ignoredPathPatterns || [];
  }

  /**
   * Captures an HTTP transaction non-blockingly into the circular buffer
   */
  capture(record: Omit<HttpRequestRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): HttpRequestRecord | null {
    const rawPath = record.path || record.url || '/';

    // 1. Static asset filter
    if (this.excludeStaticAssets && STATIC_EXTENSION_REGEX.test(rawPath.split('?')[0])) {
      return null;
    }

    // 2. Ignored patterns filter
    for (const pattern of this.ignoredPathPatterns) {
      if (typeof pattern === 'string' && rawPath.includes(pattern)) return null;
      if (pattern instanceof RegExp && pattern.test(rawPath)) return null;
    }

    // 3. Path Normalization
    const normalizedPath = record.normalizedPath || PathNormalizer.normalize(rawPath);

    // 4. PII Scrubbing
    const requestHeaders = this.sanitizePii
      ? PiiSanitizer.sanitizeHeaders(record.requestHeaders || {})
      : record.requestHeaders || {};

    const responseHeaders = this.sanitizePii
      ? PiiSanitizer.sanitizeHeaders(record.responseHeaders || {})
      : record.responseHeaders || {};

    const requestBody = this.sanitizePii
      ? PiiSanitizer.sanitizePayload(record.requestBody)
      : record.requestBody;

    const responseBody = this.sanitizePii
      ? PiiSanitizer.sanitizePayload(record.responseBody)
      : record.responseBody;

    // 5. Query parameters extraction if not already present
    let queryParams = record.queryParams;
    if (!queryParams && record.url && record.url.includes('?')) {
      try {
        const parsedUrl = new URL(record.url.startsWith('http') ? record.url : `http://localhost${record.url}`);
        queryParams = {};
        parsedUrl.searchParams.forEach((v, k) => {
          queryParams![k] = v;
        });
      } catch {
        // Ignore malformed URL query
      }
    }

    const item: HttpRequestRecord = {
      id: record.id || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: record.timestamp || new Date().toISOString(),
      method: record.method,
      url: record.url,
      path: rawPath,
      normalizedPath,
      queryParams,
      requestHeaders,
      requestBody,
      statusCode: record.statusCode,
      responseHeaders,
      responseBody,
      durationMs: record.durationMs,
      clientIp: record.clientIp,
      source: record.source || 'manual',
    };

    // Circular buffer eviction
    if (this.buffer.length >= this.maxCapacity) {
      this.buffer.shift();
    }
    this.buffer.push(item);

    return item;
  }

  getRecords(): HttpRequestRecord[] {
    return [...this.buffer];
  }

  getCount(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}
