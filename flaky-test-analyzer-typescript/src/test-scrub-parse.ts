import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { parseTrace } from './parsers/trace';
import { sanitizeContext, loadConfig } from './sanitization/scrubber';
import { RawDiagnosticContext } from './types';

// Create a mock trace.zip for validation
function createMockTraceZip(outputPath: string) {
  const zip = new AdmZip();

  // Mock trace.playwright-trace events (NDJSON)
  const traceEvents = [
    JSON.stringify({
      type: 'action',
      metadata: {
        apiName: 'goto',
        params: { url: 'https://example.com/login?token=secret123' },
        duration: 250
      }
    }),
    JSON.stringify({
      type: 'action',
      metadata: {
        apiName: 'fill',
        params: { selector: 'input[name="password"]', value: 'mySuperSecurePassword123' },
        duration: 120
      }
    }),
    JSON.stringify({
      type: 'console',
      text: 'User secret_agent@example.com logged in successfully',
      level: 'info',
      timestamp: Date.now()
    }),
    JSON.stringify({
      type: 'action',
      metadata: {
        apiName: 'click',
        params: { selector: 'button#btn-pay' },
        duration: 50,
        error: {
          message: 'Timeout 5000ms waiting for payment api response',
          stack: 'Error: Timeout at click (login.spec.ts:15:24)'
        }
      }
    })
  ].join('\n');

  // Mock trace.network events (NDJSON)
  const networkEvents = [
    JSON.stringify({
      type: 'network',
      request: {
        url: 'https://api.example.com/v1/payment?key=apiKeySecret456',
        method: 'POST',
        headers: { 'authorization': 'Bearer jwt.token.here', 'content-type': 'application/json' },
        postData: JSON.stringify({ card: '1111222233334444', cvv: '123', email: 'user@example.com' })
      },
      response: {
        status: 400,
        headers: { 'content-type': 'application/json' },
        bodySha1: 'mockBodyHash123'
      }
    })
  ].join('\n');

  zip.addFile('trace.playwright-trace', Buffer.from(traceEvents, 'utf8'));
  zip.addFile('trace.network', Buffer.from(networkEvents, 'utf8'));

  // Mock response resource body
  const mockResponseBody = JSON.stringify({
    status: 'error',
    message: 'Invalid creditcard details provided for user@example.com',
    secretTokenRef: 'abc-xyz-token'
  });
  zip.addFile('resources/mockBodyHash123', Buffer.from(mockResponseBody, 'utf8'));

  zip.writeZip(outputPath);
}

async function runTest() {
  console.log('--- 🧪 STARTING TRACERCA SANDBOX TEST ---');
  const tempDir = path.join(process.cwd(), 'temp-test-results');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const mockZipPath = path.join(tempDir, 'mock-trace.zip');
  
  console.log(`1. Generating mock trace.zip at ${mockZipPath}...`);
  createMockTraceZip(mockZipPath);

  console.log('2. Parsing trace.zip...');
  const parsedContext = await parseTrace(
    mockZipPath,
    'test-id-123',
    'should checkout successfully',
    {
      className: 'CheckoutTestSuite',
      filePath: 'tests/checkout.spec.ts',
      errorMessage: 'Original timeout fallback error',
      stackTrace: 'Original stack fallback trace'
    }
  );

  console.log('\n--- Parsed Raw Diagnostic Context ---');
  console.log(`Test Name: ${parsedContext.testName}`);
  console.log(`Actions Captured: ${parsedContext.recentActions.length}`);
  console.log(`Console Logs Captured: ${parsedContext.consoleLogs.length}`);
  console.log(`Failed Requests Captured: ${parsedContext.failedRequests.length}`);

  console.log('\nFailed request headers:', parsedContext.failedRequests[0]?.requestHeaders);
  console.log('Failed request body:', parsedContext.failedRequests[0]?.requestBody);
  console.log('Failed response body:', parsedContext.failedRequests[0]?.responseBody);

  console.log('\n3. Loading configuration & scrubbing context...');
  const config = loadConfig();
  const scrubbedContext = sanitizeContext(parsedContext, config.sanitization);

  console.log('\n--- Scrubbed Diagnostic Context ---');
  console.log('Scrubbed failed request URL:', scrubbedContext.failedRequests[0]?.url);
  console.log('Scrubbed failed request headers:', scrubbedContext.failedRequests[0]?.requestHeaders);
  console.log('Scrubbed failed request body:', scrubbedContext.failedRequests[0]?.requestBody);
  console.log('Scrubbed failed response body:', scrubbedContext.failedRequests[0]?.responseBody);
  console.log('Scrubbed console log:', scrubbedContext.consoleLogs[0]?.text);
  console.log('Scrubbed failed action selector/value:', scrubbedContext.recentActions.find(a => a.action === 'fill'));

  // Clean up
  console.log('\n4. Cleaning up temp files...');
  if (fs.existsSync(mockZipPath)) fs.unlinkSync(mockZipPath);
  if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);

  console.log('\n--- 🧪 TEST COMPLETE: SUCCESS ---');
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
