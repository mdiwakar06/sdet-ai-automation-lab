/**
 * Use Case 2 (UC-2) Test Suite
 * Playwright trace ZIP ingestion, action event extraction, and timing bottleneck profiling.
 */

import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { TestSuiteRunner, expect } from '../framework/test-runner';
import { parseTrace } from '../../src/parsers/trace';
import { RawDiagnosticContext } from '../../src/types';

export const uc2Suite = new TestSuiteRunner('UC-2: Playwright Trace ZIP Ingestion & Bottleneck Profiling');

const tempDir = path.resolve(__dirname, '../../temp-uc2-fixtures');
const mockTraceZipPath = path.join(tempDir, 'sample-checkout-trace.zip');

function createComprehensiveTraceZip(outputPath: string): void {
  const zip = new AdmZip();

  // Mock trace.playwright-trace events (NDJSON)
  const traceEvents = [
    JSON.stringify({
      type: 'action',
      metadata: {
        apiName: 'goto',
        params: { url: 'https://ecommerce.example.com/checkout' },
        duration: 320
      }
    }),
    JSON.stringify({
      type: 'action',
      metadata: {
        apiName: 'fill',
        params: { selector: 'input#card-number', value: '4111222233334444' },
        duration: 110
      }
    }),
    JSON.stringify({
      type: 'action',
      metadata: {
        apiName: 'fill',
        params: { selector: 'input#cvv', value: '123' },
        duration: 85
      }
    }),
    JSON.stringify({
      type: 'console',
      text: 'Client side payment form rendered in 45ms',
      level: 'info',
      timestamp: 1700000000000
    }),
    JSON.stringify({
      type: 'console',
      text: 'Payment gateway connection warning: latency > 3000ms',
      level: 'warning',
      timestamp: 1700000001000
    }),
    JSON.stringify({
      type: 'action',
      metadata: {
        apiName: 'click',
        params: { selector: 'button#submit-order' },
        duration: 5200, // Bottleneck step!
        error: {
          message: 'TimeoutError: locator.click: Timeout 5000ms exceeded waiting for element to be stable',
          stack: 'TimeoutError at CheckoutPage.submitOrder (pages/checkout.page.ts:42:15)'
        }
      }
    }),
    JSON.stringify({
      type: 'console',
      text: 'Uncaught Promise Rejection: Payment API timeout 504',
      level: 'error',
      timestamp: 1700000005200
    })
  ].join('\n');

  // Mock trace.network events (NDJSON)
  const networkEvents = [
    JSON.stringify({
      type: 'network',
      request: {
        url: 'https://api.ecommerce.example.com/v2/orders/checkout',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secretToken',
          'x-trace-id': 'trace-98765'
        },
        postData: JSON.stringify({ amount: 99.99, currency: 'USD', token: 'tok_abc123' })
      },
      response: {
        status: 504,
        headers: {
          'content-type': 'application/json',
          'server': 'cloudflare'
        },
        bodySha1: 'sha1_error_body_504'
      }
    }),
    // 200 OK request that should be filtered out from failedRequests
    JSON.stringify({
      type: 'network',
      request: {
        url: 'https://api.ecommerce.example.com/v2/user/session',
        method: 'GET',
        headers: { 'accept': 'application/json' }
      },
      response: {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: '{"session": "active"}'
      }
    })
  ].join('\n');

  zip.addFile('trace.playwright-trace', Buffer.from(traceEvents, 'utf8'));
  zip.addFile('trace.network', Buffer.from(networkEvents, 'utf8'));

  // Add SHA-1 referenced response body
  const errorResponseBody = JSON.stringify({
    error: 'Gateway Timeout',
    statusCode: 504,
    detail: 'Upstream payment processor did not respond in 5000ms'
  });
  zip.addFile('resources/sha1_error_body_504', Buffer.from(errorResponseBody, 'utf8'));

  zip.writeZip(outputPath);
}

uc2Suite.beforeAll(() => {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  createComprehensiveTraceZip(mockTraceZipPath);
});

uc2Suite.afterAll(() => {
  if (fs.existsSync(mockTraceZipPath)) {
    fs.unlinkSync(mockTraceZipPath);
  }
  if (fs.existsSync(tempDir)) {
    fs.rmdirSync(tempDir);
  }
});

uc2Suite.test('UC2.1: Ingest Playwright trace ZIP and extract structured actions', async () => {
  const context = await parseTrace(
    mockTraceZipPath,
    'checkout-test-01',
    'should complete checkout order with credit card'
  );

  expect(context.testId).toBe('checkout-test-01');
  expect(context.testName).toBe('should complete checkout order with credit card');
  expect(context.recentActions.length).toBe(4);

  // Validate step sequence
  expect(context.recentActions[0].step).toBe(1);
  expect(context.recentActions[0].action).toBe('goto');
  expect(context.recentActions[1].step).toBe(2);
  expect(context.recentActions[1].action).toBe('fill');
  expect(context.recentActions[1].selector).toBe('input#card-number');
  expect(context.recentActions[2].step).toBe(3);
  expect(context.recentActions[2].action).toBe('fill');
  expect(context.recentActions[3].step).toBe(4);
  expect(context.recentActions[3].action).toBe('click');
});

uc2Suite.test('UC2.2: Extract failed action and diagnostic error metadata', async () => {
  const context = await parseTrace(
    mockTraceZipPath,
    'checkout-test-01',
    'should complete checkout order with credit card'
  );

  expect(context.failedAction).toBeDefined();
  expect(context.failedAction?.name).toBe('click');
  expect(context.failedAction?.selector).toBe('button#submit-order');
  expect(context.failedAction?.ordinal).toBe(4);

  expect(context.errorMessage).toContain('Timeout 5000ms exceeded');
  expect(context.stackTrace).toContain('pages/checkout.page.ts:42:15');
});

uc2Suite.test('UC2.3: Timing bottleneck profiling across action lifecycle', async () => {
  const context = await parseTrace(
    mockTraceZipPath,
    'checkout-test-01',
    'should complete checkout order with credit card'
  );

  // Profile all actions for bottleneck identification
  const actions = context.recentActions;
  const durations = actions.map(a => a.duration || 0);

  const maxDuration = Math.max(...durations);
  const bottleneckAction = actions.find(a => (a.duration || 0) === maxDuration);

  expect(maxDuration).toBe(5200);
  expect(bottleneckAction).toBeDefined();
  expect(bottleneckAction?.action).toBe('click');
  expect(bottleneckAction?.selector).toBe('button#submit-order');
  expect(bottleneckAction?.status).toBe('failed');
});

uc2Suite.test('UC2.4: Extract browser console logs & network logs with resource resolution', async () => {
  const context = await parseTrace(
    mockTraceZipPath,
    'checkout-test-01',
    'should complete checkout order with credit card'
  );

  // Verify console logs
  expect(context.consoleLogs.length).toBe(3);
  const levels = context.consoleLogs.map(c => c.level);
  expect(levels).toContain('info');
  expect(levels).toContain('warning');
  expect(levels).toContain('error');

  // Verify failed network requests (only >= 400 captured)
  expect(context.failedRequests.length).toBe(1);
  const failedReq = context.failedRequests[0];
  expect(failedReq.url).toBe('https://api.ecommerce.example.com/v2/orders/checkout');
  expect(failedReq.method).toBe('POST');
  expect(failedReq.status).toBe(504);
  expect(failedReq.requestHeaders?.['x-trace-id']).toBe('trace-98765');
  expect(failedReq.requestBody).toContain('tok_abc123');

  // Response body resolved from resources/sha1_error_body_504
  expect(failedReq.responseBody).toBeDefined();
  expect(failedReq.responseBody).toContain('Gateway Timeout');
  expect(failedReq.responseBody).toContain('Upstream payment processor');
});

uc2Suite.test('UC2.5: Resilient graceful fallback when trace file is missing or corrupt', async () => {
  const fallbackData = {
    className: 'TestSuiteFallback',
    filePath: 'tests/fallback.spec.ts',
    errorMessage: 'Connection reset by peer',
    stackTrace: 'Error at Socket.connect (net.js:12:34)'
  };

  const context = await parseTrace(
    '/non/existent/path/missing-trace.zip',
    'test-fallback-99',
    'should handle missing trace gracefully',
    fallbackData
  );

  expect(context.testId).toBe('test-fallback-99');
  expect(context.testName).toBe('should handle missing trace gracefully');
  expect(context.className).toBe('TestSuiteFallback');
  expect(context.filePath).toBe('tests/fallback.spec.ts');
  expect(context.errorMessage).toBe('Connection reset by peer');
  expect(context.stackTrace).toBe('Error at Socket.connect (net.js:12:34)');
  expect(context.recentActions.length).toBe(0);
  expect(context.failedRequests.length).toBe(0);
  expect(context.consoleLogs.length).toBe(0);
});
