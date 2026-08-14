/**
 * HAR (HTTP Archive) File Parser for DriftGuard
 */

import { HarArchive, HttpRequestRecord, HttpMethod } from '../types/traffic';

export class HarParser {
  /**
   * Converts a HAR JSON Archive object into HttpRequestRecord array
   */
  static parse(harContent: string | HarArchive): HttpRequestRecord[] {
    const archive: HarArchive =
      typeof harContent === 'string' ? JSON.parse(harContent) : harContent;

    if (!archive.log || !Array.isArray(archive.log.entries)) {
      throw new Error('Invalid HAR file: missing log.entries array.');
    }

    const records: HttpRequestRecord[] = [];

    for (let i = 0; i < archive.log.entries.length; i++) {
      const entry = archive.log.entries[i];
      const req = entry.request;
      const res = entry.response;

      if (!req || !res) continue;

      const requestHeaders: Record<string, string> = {};
      if (req.headers) {
        for (const h of req.headers) {
          requestHeaders[h.name.toLowerCase()] = h.value;
        }
      }

      const responseHeaders: Record<string, string> = {};
      if (res.headers) {
        for (const h of res.headers) {
          responseHeaders[h.name.toLowerCase()] = h.value;
        }
      }

      const queryParams: Record<string, string> = {};
      if (req.queryString) {
        for (const q of req.queryString) {
          queryParams[q.name] = q.value;
        }
      }

      let requestBody: any = undefined;
      if (req.postData?.text) {
        try {
          requestBody = JSON.parse(req.postData.text);
        } catch {
          requestBody = req.postData.text;
        }
      }

      let responseBody: any = undefined;
      if (res.content?.text) {
        try {
          responseBody = JSON.parse(res.content.text);
        } catch {
          responseBody = res.content.text;
        }
      }

      let parsedPath = '/';
      try {
        const urlObj = new URL(req.url);
        parsedPath = urlObj.pathname;
      } catch {
        parsedPath = req.url.split('?')[0];
      }

      records.push({
        id: `har-${i + 1}`,
        timestamp: entry.startedDateTime || new Date().toISOString(),
        method: req.method.toUpperCase() as HttpMethod,
        url: req.url,
        path: parsedPath,
        queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        requestHeaders,
        requestBody,
        statusCode: res.status,
        responseHeaders,
        responseBody,
        durationMs: entry.time,
        source: 'har',
      });
    }

    return records;
  }
}
