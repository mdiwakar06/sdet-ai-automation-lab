/**
 * Playwright Network Interceptor for DriftGuard
 * Hooks into Playwright Page or BrowserContext to capture live HTTP traffic seamlessly
 */

import { Page, BrowserContext, Request, Response } from 'playwright';
import { TrafficCollector } from './TrafficCollector';
import { HttpMethod } from '../types/traffic';
import { logger } from '../utils/logger';

export interface InterceptorOptions {
  includePatterns?: (string | RegExp)[];
  excludePatterns?: (string | RegExp)[];
}

export class PlaywrightInterceptor {
  private collector: TrafficCollector;
  private options: InterceptorOptions;

  constructor(collector: TrafficCollector, options: InterceptorOptions = {}) {
    this.collector = collector;
    this.options = options;
  }

  /**
   * Attaches interceptor to a Playwright Page or BrowserContext
   */
  attach(target: Page | BrowserContext): void {
    target.on('response', async (response: Response) => {
      try {
        await this.handleResponse(response);
      } catch (err: any) {
        logger.debug(`Playwright capture error: ${err.message}`);
      }
    });
  }

  private async handleResponse(response: Response): Promise<void> {
    const request = response.request();
    const url = response.url();

    // Check inclusion / exclusion patterns
    if (this.options.excludePatterns) {
      for (const p of this.options.excludePatterns) {
        if (typeof p === 'string' && url.includes(p)) return;
        if (p instanceof RegExp && p.test(url)) return;
      }
    }

    if (this.options.includePatterns && this.options.includePatterns.length > 0) {
      const isIncluded = this.options.includePatterns.some((p) =>
        typeof p === 'string' ? url.includes(p) : p.test(url)
      );
      if (!isIncluded) return;
    }

    const method = request.method().toUpperCase() as HttpMethod;
    const statusCode = response.status();
    const requestHeaders = request.headers();
    const responseHeaders = response.headers();

    // Parse Request Body
    let requestBody: any = undefined;
    const postData = request.postData();
    if (postData) {
      try {
        requestBody = JSON.parse(postData);
      } catch {
        requestBody = postData;
      }
    }

    // Parse Response Body
    let responseBody: any = undefined;
    const contentType = responseHeaders['content-type'] || '';
    if (contentType.includes('application/json') || contentType.includes('+json')) {
      try {
        responseBody = await response.json();
      } catch {
        // Response body might be empty or consumed
      }
    } else if (contentType.includes('text/') || contentType.includes('application/xml')) {
      try {
        responseBody = await response.text();
      } catch {
        // Ignore
      }
    }

    let parsedPath = '/';
    try {
      const parsedUrl = new URL(url);
      parsedPath = parsedUrl.pathname;
    } catch {
      parsedPath = url;
    }

    this.collector.capture({
      method,
      url,
      path: parsedPath,
      requestHeaders,
      requestBody,
      statusCode,
      responseHeaders,
      responseBody,
      source: 'playwright',
    });
  }
}
