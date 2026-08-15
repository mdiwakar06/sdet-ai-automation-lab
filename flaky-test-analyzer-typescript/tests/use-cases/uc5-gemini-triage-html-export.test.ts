/**
 * Use Case 5 (UC-5) Test Suite
 * Gemini AST root-cause triage classification, code fix generation, and HTML report exporting.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteRunner, expect } from '../framework/test-runner';
import { compilePrompt } from '../../src/ai/client';
import { generateHtmlReport } from '../../src/reporters/html';
import { RawDiagnosticContext, TraceRCAReport, AIAnalysisResult } from '../../src/types';

export const uc5Suite = new TestSuiteRunner('UC-5: Gemini Triage Classification, Code Fixes & HTML Export');

const tempDir = path.resolve(__dirname, '../../temp-uc5-output');
const htmlReportPath = path.join(tempDir, 'test-dashboard.html');

uc5Suite.beforeAll(() => {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
});

uc5Suite.afterAll(() => {
  if (fs.existsSync(htmlReportPath)) {
    fs.unlinkSync(htmlReportPath);
  }
  if (fs.existsSync(tempDir)) {
    fs.rmdirSync(tempDir);
  }
});

uc5Suite.test('UC5.1: Structured diagnostic telemetry prompt compilation', () => {
  const context: RawDiagnosticContext = {
    testId: 'order-submit-01',
    testName: 'should submit checkout order with discount voucher',
    filePath: 'tests/e2e/checkout.spec.ts',
    errorMessage: 'Error: Timeout 5000ms waiting for element "div.order-confirmation"',
    stackTrace: 'Error: Timeout at CheckoutPage.submit (pages/checkout.ts:35:10)\n at Test.run (tests/checkout.spec.ts:20:5)',
    failedAction: {
      name: 'click',
      selector: 'button#btn-place-order',
      ordinal: 4
    },
    recentActions: [
      { step: 1, action: 'goto', value: 'https://shop.example.com/checkout', status: 'passed' },
      { step: 2, action: 'fill', selector: 'input#voucher-code', value: 'SUMMER2026', status: 'passed' },
      { step: 3, action: 'click', selector: 'button#apply-voucher', status: 'passed' },
      { step: 4, action: 'click', selector: 'button#btn-place-order', status: 'failed' }
    ],
    consoleLogs: [
      { level: 'info', text: 'Voucher applied successfully' },
      { level: 'error', text: 'Uncaught TypeError: Cannot read properties of undefined (reading orderId)' }
    ],
    failedRequests: [
      {
        url: 'https://api.shop.example.com/v1/orders/create',
        method: 'POST',
        status: 500,
        requestHeaders: { 'content-type': 'application/json' },
        requestBody: '{"voucher": "SUMMER2026", "amount": 80.00}',
        responseHeaders: { 'content-type': 'application/json' },
        responseBody: '{"error": "InternalServerError", "message": "Database transaction deadlock on vouchers table"}'
      }
    ]
  };

  const prompt = compilePrompt(context);

  // Assert essential prompt components
  expect(prompt).toContain('You are TraceRCA, an expert automated QA Failure Investigator');
  expect(prompt).toContain('App Bug');
  expect(prompt).toContain('Test Bug');
  expect(prompt).toContain('Infra Flake');
  expect(prompt).toContain('Test Name: should submit checkout order with discount voucher');
  expect(prompt).toContain('Test Suite: tests/e2e/checkout.spec.ts');
  expect(prompt).toContain('Failed Step: Action "click" on selector "button#btn-place-order"');
  expect(prompt).toContain('Step 2: fill on input#voucher-code with value "SUMMER2026"');
  expect(prompt).toContain('[ERROR] Uncaught TypeError: Cannot read properties of undefined');
  expect(prompt).toContain('API Call: POST https://api.shop.example.com/v1/orders/create');
  expect(prompt).toContain('Database transaction deadlock on vouchers table');
});

uc5Suite.test('UC5.2: Triage schema validation & bug classification logic', () => {
  // Mock AI result for App Bug
  const appBugAnalysis: AIAnalysisResult = {
    classification: 'App Bug',
    confidence: 'High',
    summary: 'The backend orders API failed with 500 Internal Server Error due to a database deadlock.',
    detailedAnalysis: 'Step 4 clicked the place order button which triggered POST /v1/orders/create. The server responded with 500 and "Database transaction deadlock on vouchers table". The client frontend subsequently crashed when accessing undefined orderId.',
    recommendedFix: 'Fix the backend transaction isolation level in the voucher redemption query or add retry logic in the orders service.'
  };

  expect(appBugAnalysis.classification).toBe('App Bug');
  expect(appBugAnalysis.confidence).toBe('High');
  expect(appBugAnalysis.summary).toContain('500 Internal Server Error');
  expect(appBugAnalysis.recommendedFix).toContain('transaction isolation level');

  // Mock AI result for Test Bug
  const testBugAnalysis: AIAnalysisResult = {
    classification: 'Test Bug',
    confidence: 'High',
    summary: 'The test attempted to click a submit button before the asynchronous voucher validation completed.',
    detailedAnalysis: 'Step 3 clicked #apply-voucher, and Step 4 immediately attempted to click #btn-place-order while the DOM was still disabled during the voucher calculation state.',
    recommendedFix: 'Add "await expect(page.locator(\'.voucher-success-badge\')).toBeVisible();" before clicking #btn-place-order.'
  };

  expect(testBugAnalysis.classification).toBe('Test Bug');
  expect(testBugAnalysis.confidence).toBe('High');
  expect(testBugAnalysis.recommendedFix).toContain('toBeVisible()');

  // Mock AI result for Infra Flake
  const infraFlakeAnalysis: AIAnalysisResult = {
    classification: 'Infra Flake',
    confidence: 'High',
    summary: 'Third-party gateway timeout (HTTP 504) from Cloudflare edge proxy.',
    detailedAnalysis: 'Network telemetry recorded a 504 Gateway Timeout from the payment proxy after 5000ms.',
    recommendedFix: 'Configure Playwright retry policy or check proxy edge node status.'
  };

  expect(infraFlakeAnalysis.classification).toBe('Infra Flake');
});

uc5Suite.test('UC5.3: Generate interactive Tailwind HTML dashboard export', () => {
  const reports: TraceRCAReport[] = [
    {
      testId: 'test-app-bug-01',
      testName: 'should submit checkout order with discount voucher',
      filePath: 'tests/e2e/checkout.spec.ts',
      timestamp: new Date('2026-08-15T10:00:00Z'),
      rawContext: {
        testId: 'test-app-bug-01',
        testName: 'should submit checkout order with discount voucher',
        filePath: 'tests/e2e/checkout.spec.ts',
        errorMessage: 'Error: 500 Internal Server Error on /api/orders',
        stackTrace: 'Error at checkout.spec.ts:45:10',
        failedAction: { name: 'click', selector: 'button#btn-place-order', ordinal: 4 },
        recentActions: [
          { step: 1, action: 'goto', value: 'https://shop.com', status: 'passed' },
          { step: 2, action: 'click', selector: 'button#btn-place-order', status: 'failed', duration: 1200 }
        ],
        consoleLogs: [
          { level: 'error', text: 'Unhandled rejection: 500 Server Error' }
        ],
        failedRequests: [
          {
            url: 'https://api.shop.com/api/orders',
            method: 'POST',
            status: 500,
            requestHeaders: { 'content-type': 'application/json' },
            responseBody: '{"error": "Database deadlock"}'
          }
        ]
      },
      aiAnalysis: {
        classification: 'App Bug',
        confidence: 'High',
        summary: 'Backend 500 server error during voucher redemption.',
        detailedAnalysis: 'The orders service threw an unhandled database exception.',
        recommendedFix: 'Review transaction locking in orders-microservice/src/checkout.go:120'
      }
    },
    {
      testId: 'test-test-bug-02',
      testName: 'should display promo banner on homepage',
      filePath: 'tests/e2e/home.spec.ts',
      timestamp: new Date('2026-08-15T10:05:00Z'),
      rawContext: {
        testId: 'test-test-bug-02',
        testName: 'should display promo banner on homepage',
        filePath: 'tests/e2e/home.spec.ts',
        errorMessage: 'Timed out 5000ms waiting for locator(".banner-promo")',
        recentActions: [
          { step: 1, action: 'goto', value: 'https://shop.com/home', status: 'passed' }
        ],
        consoleLogs: [],
        failedRequests: []
      },
      aiAnalysis: {
        classification: 'Test Bug',
        confidence: 'High',
        summary: 'Selector ".banner-promo" was renamed in DOM.',
        detailedAnalysis: 'The test failed looking for old CSS class name.',
        recommendedFix: 'Update locator to use page.getByTestId("home-promo-banner")'
      }
    },
    {
      testId: 'test-infra-flake-03',
      testName: 'should load dynamic recommendations widget',
      filePath: 'tests/e2e/recs.spec.ts',
      timestamp: new Date('2026-08-15T10:10:00Z'),
      rawContext: {
        testId: 'test-infra-flake-03',
        testName: 'should load dynamic recommendations widget',
        filePath: 'tests/e2e/recs.spec.ts',
        errorMessage: 'Network 504 Gateway Timeout',
        recentActions: [],
        consoleLogs: [],
        failedRequests: [
          {
            url: 'https://recs-api.shop.com/feed',
            method: 'GET',
            status: 504,
            responseBody: '504 Gateway Time-out'
          }
        ]
      },
      aiAnalysis: {
        classification: 'Infra Flake',
        confidence: 'Medium',
        summary: 'Cloudflare proxy 504 timeout on recommendations endpoint.',
        detailedAnalysis: 'The downstream recs engine experienced network saturation.',
        recommendedFix: 'Implement retry with exponential backoff on client SDK.'
      }
    }
  ];

  generateHtmlReport(reports, htmlReportPath);

  // Assert file creation
  expect(fs.existsSync(htmlReportPath)).toBe(true);
  const htmlContent = fs.readFileSync(htmlReportPath, 'utf-8');

  // Verify dashboard branding & components
  expect(htmlContent).toContain('<!DOCTYPE html>');
  expect(htmlContent).toContain('TraceRCA');
  expect(htmlContent).toContain('Automated QA Failure Investigation & Root-Cause Analyzer');
  expect(htmlContent).toContain('tailwindcss.com');
  expect(htmlContent).toContain('JetBrains+Mono');

  // Verify filter buttons exist
  expect(htmlContent).toContain('btn-filter-all');
  expect(htmlContent).toContain('btn-filter-app');
  expect(htmlContent).toContain('btn-filter-test');
  expect(htmlContent).toContain('btn-filter-infra');

  // Verify sanitized JSON embedded safely
  expect(htmlContent).toContain('should submit checkout order with discount voucher');
  expect(htmlContent).toContain('App Bug');
  expect(htmlContent).toContain('Test Bug');
  expect(htmlContent).toContain('Infra Flake');
  expect(htmlContent).toContain('Review transaction locking in orders-microservice/src/checkout.go');
  expect(htmlContent).toContain('page.getByTestId');
});
