/**
 * HTTP Traffic and Capture Types for DriftGuard
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE';

export interface HttpRequestRecord {
  id: string;
  timestamp: string; // ISO 8601
  method: HttpMethod;
  url: string;
  path: string;
  normalizedPath?: string;
  queryParams?: Record<string, string | string[]>;
  requestHeaders: Record<string, string>;
  requestBody?: any;
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody?: any;
  durationMs?: number;
  clientIp?: string;
  source?: 'playwright' | 'har' | 'proxy' | 'manual';
}

export interface TrafficCollectorOptions {
  maxBufferSize?: number;
  excludeStaticAssets?: boolean;
  ignoredPathPatterns?: (RegExp | string)[];
  sanitizePii?: boolean;
}

export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion?: string;
    headers: Array<{ name: string; value: string }>;
    queryString?: Array<{ name: string; value: string }>;
    postData?: {
      mimeType?: string;
      text?: string;
    };
  };
  response: {
    status: number;
    statusText?: string;
    headers: Array<{ name: string; value: string }>;
    content?: {
      size?: number;
      mimeType?: string;
      text?: string;
    };
  };
}

export interface HarArchive {
  log: {
    version: string;
    creator?: { name: string; version: string };
    entries: HarEntry[];
  };
}
