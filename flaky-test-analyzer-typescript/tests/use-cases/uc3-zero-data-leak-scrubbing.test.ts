/**
 * Use Case 3 (UC-3) Test Suite
 * Zero-data-leak PII scrubbing & secret sanitization (Bearer tokens, API keys, emails, passwords).
 */

import { TestSuiteRunner, expect } from '../framework/test-runner';
import {
  sanitizeHeaders,
  sanitizeUrl,
  sanitizeText,
  traverseAndMask,
  sanitizeBody,
  sanitizeContext,
  loadConfig
} from '../../src/sanitization/scrubber';
import { RawDiagnosticContext, ScrubberConfig } from '../../src/types';

export const uc3Suite = new TestSuiteRunner('UC-3: Zero-Data-Leak PII Scrubbing & Secret Sanitization');

const testConfig: ScrubberConfig = {
  maskValue: '[REDACTED_BY_TRACERCA]',
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-session-token',
    'proxy-authorization',
    'apikey',
    'api-key'
  ],
  sensitiveKeys: [
    'password',
    'pwd',
    'token',
    'secret',
    'cvv',
    'creditcard',
    'ssn',
    'email',
    'username',
    'passphrase',
    'key',
    'apikey',
    'api_key'
  ],
  customRegexPatterns: [
    {
      name: 'Email Address',
      pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
      replacement: '[EMAIL_REDACTED]'
    },
    {
      name: 'Bearer JWT Token',
      pattern: 'bearer\\s+[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*',
      replacement: 'Bearer [JWT_REDACTED]'
    },
    {
      name: 'Credit Card',
      pattern: '\\b(?:\\d[ -]*?){13,16}\\b',
      replacement: '[CREDIT_CARD_REDACTED]'
    }
  ]
};

uc3Suite.test('UC3.1: Sensitive HTTP headers scrubbing & non-sensitive preservation', () => {
  const dirtyHeaders: Record<string, string> = {
    'Authorization': 'Bearer secret_jwt_token_12345',
    'Cookie': 'session_id=abcdef123456; theme=dark',
    'Set-Cookie': 'auth_token=xyz987; HttpOnly; Secure',
    'X-API-Key': 'prod-api-key-999',
    'X-Session-Token': 'session_token_xyz',
    'Proxy-Authorization': 'Basic dXNlcjpwYXNz',
    'Content-Type': 'application/json; charset=utf-8',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Mozilla/5.0 Playwright E2E'
  };

  const scrubbed = sanitizeHeaders(dirtyHeaders, testConfig);

  // Sensitive headers must be masked
  expect(scrubbed['authorization']).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed['cookie']).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed['set-cookie']).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed['x-api-key']).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed['x-session-token']).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed['proxy-authorization']).toBe('[REDACTED_BY_TRACERCA]');

  // Non-sensitive headers must be preserved
  expect(scrubbed['content-type']).toBe('application/json; charset=utf-8');
  expect(scrubbed['accept-encoding']).toBe('gzip, deflate, br');
  expect(scrubbed['user-agent']).toBe('Mozilla/5.0 Playwright E2E');
});

uc3Suite.test('UC3.2: URL query parameter scrubbing across absolute and relative endpoints', () => {
  // Absolute URL with sensitive params
  const dirtyUrl1 = 'https://api.payment.com/v1/charge?token=tok_secret_999&apiKey=pk_live_888&amount=5000&currency=USD';
  const scrubbedUrl1 = sanitizeUrl(dirtyUrl1, testConfig);
  expect(scrubbedUrl1).toContain('token=%5BREDACTED_BY_TRACERCA%5D');
  expect(scrubbedUrl1).toContain('apiKey=%5BREDACTED_BY_TRACERCA%5D');
  expect(scrubbedUrl1).toContain('amount=5000');
  expect(scrubbedUrl1).toContain('currency=USD');
  expect(scrubbedUrl1).not.toContain('tok_secret_999');
  expect(scrubbedUrl1).not.toContain('pk_live_888');

  // Relative URL with sensitive params
  const dirtyUrl2 = '/auth/callback?password=myPassword123&username=lead_sdet&redirect_url=/home';
  const scrubbedUrl2 = sanitizeUrl(dirtyUrl2, testConfig);
  expect(scrubbedUrl2).toContain('password=[REDACTED_BY_TRACERCA]');
  expect(scrubbedUrl2).toContain('username=[REDACTED_BY_TRACERCA]');
  expect(scrubbedUrl2).toContain('redirect_url=/home');
  expect(scrubbedUrl2).not.toContain('myPassword123');
});

uc3Suite.test('UC3.3: AST recursive JSON payload traversal and key masking', () => {
  const dirtyObject = {
    transactionId: 'tx-100234',
    status: 'pending',
    auth: {
      credentials: {
        password: 'SuperSecretPassword!',
        token: 'ey12345token',
        apiKey: 'key_xyz_789'
      },
      tokensList: ['secret-1', 'secret-2']
    },
    customer: {
      email: 'alex.doe@fintechcorp.com',
      ssn: '123-45-6789',
      paymentProfile: {
        creditCard: '4111222233334444',
        cvv: '999'
      }
    },
    items: [
      { id: 'item-1', name: 'Standard Widget', price: 29.99 },
      { id: 'item-2', name: 'Secret Access Pass', secret: 'internal-badge-key' }
    ]
  };

  const scrubbed = traverseAndMask(dirtyObject, testConfig);

  // Assert deeply nested fields masked
  expect(scrubbed.transactionId).toBe('tx-100234');
  expect(scrubbed.auth.credentials.password).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed.auth.credentials.token).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed.auth.credentials.apiKey).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed.customer.email).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed.customer.ssn).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed.customer.paymentProfile.creditCard).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed.customer.paymentProfile.cvv).toBe('[REDACTED_BY_TRACERCA]');
  expect(scrubbed.items[0].name).toBe('Standard Widget');
  expect(scrubbed.items[1].secret).toBe('[REDACTED_BY_TRACERCA]');
});

uc3Suite.test('UC3.4: Unstructured text & regex pattern sanitization (emails, JWTs, cards)', () => {
  // Email text scrubbing
  const errorWithEmail = 'Failed sending password reset notification to alice.smith+testing@company.corp: 500 error';
  const scrubbedEmail = sanitizeText(errorWithEmail, testConfig);
  expect(scrubbedEmail).toBe('Failed sending password reset notification to [EMAIL_REDACTED]: 500 error');
  expect(scrubbedEmail).not.toContain('alice.smith');

  // Bearer JWT Token scrubbing
  const logWithJwt = 'Request failed: Header bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef signature expired';
  const scrubbedJwt = sanitizeText(logWithJwt, testConfig);
  expect(scrubbedJwt).toBe('Request failed: Header Bearer [JWT_REDACTED] signature expired');
  expect(scrubbedJwt).not.toContain('eyJhbGciOi');

  // Credit card number in logs
  const logWithCard = 'Payment declined for account card 4111 2222 3333 4444 (insufficient funds)';
  const scrubbedCard = sanitizeText(logWithCard, testConfig);
  expect(scrubbedCard).toBe('Payment declined for account card [CREDIT_CARD_REDACTED] (insufficient funds)');
  expect(scrubbedCard).not.toContain('4111 2222 3333 4444');
});

uc3Suite.test('UC3.5: Comprehensive zero-data-leak context cleansing', () => {
  const dirtyContext: RawDiagnosticContext = {
    testId: 'auth-test-999',
    testName: 'should authenticate user with credentials',
    className: 'AuthenticationSuite',
    filePath: 'tests/auth.spec.ts',
    errorMessage: 'Authentication failed for admin@enterprise.com with token bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature',
    stackTrace: 'Error: Failed login at authenticate (auth.spec.ts:12:9) for user admin@enterprise.com',
    failedAction: {
      name: 'fill',
      selector: 'input#password-field',
      ordinal: 3
    },
    recentActions: [
      { step: 1, action: 'goto', value: 'https://app.com/login?token=sensitiveToken123', status: 'passed' },
      { step: 2, action: 'fill', selector: 'input#email', value: 'admin@enterprise.com', status: 'passed' },
      { step: 3, action: 'fill', selector: 'input#password', value: 'superSecretPassword', status: 'failed' }
    ],
    consoleLogs: [
      { level: 'info', text: 'Connecting to SSO for admin@enterprise.com' },
      { level: 'error', text: 'Invalid card 4111 2222 3333 4444 on registration' }
    ],
    failedRequests: [
      {
        url: 'https://api.app.com/v1/auth?token=rawTokenSecret',
        method: 'POST',
        status: 401,
        requestHeaders: {
          'authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig',
          'cookie': 'session=abc123secret'
        },
        requestBody: JSON.stringify({ password: 'secretPassword123', email: 'admin@enterprise.com' }),
        responseHeaders: {
          'set-cookie': 'bad_token=expired; Path=/'
        },
        responseBody: JSON.stringify({ error: 'Unauthorized', token: 'invalid_tok_123' })
      }
    ]
  };

  const cleanContext = sanitizeContext(dirtyContext, testConfig);

  // Verify full sanitized context
  expect(cleanContext.errorMessage).not.toContain('admin@enterprise.com');
  expect(cleanContext.errorMessage).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  expect(cleanContext.stackTrace).not.toContain('admin@enterprise.com');

  // Verify recent actions
  const fillAction = cleanContext.recentActions.find(a => a.selector === 'input#email');
  expect(fillAction?.value).toBe('[EMAIL_REDACTED]');

  // Verify console logs
  expect(cleanContext.consoleLogs[0].text).toContain('[EMAIL_REDACTED]');
  expect(cleanContext.consoleLogs[1].text).toContain('[CREDIT_CARD_REDACTED]');

  // Verify failed requests
  const req = cleanContext.failedRequests[0];
  expect(req.url).not.toContain('rawTokenSecret');
  expect(req.requestHeaders?.['authorization']).toBe('[REDACTED_BY_TRACERCA]');
  expect(req.requestHeaders?.['cookie']).toBe('[REDACTED_BY_TRACERCA]');
  expect(req.responseHeaders?.['set-cookie']).toBe('[REDACTED_BY_TRACERCA]');
  expect(req.requestBody).not.toContain('secretPassword123');
  expect(req.requestBody).toContain('[REDACTED_BY_TRACERCA]');
  expect(req.responseBody).toContain('[REDACTED_BY_TRACERCA]');
});

uc3Suite.test('UC3.6: Configuration loader fallback and custom settings merge', () => {
  // Load default configuration
  const config = loadConfig('/non/existent/tracerca.config.json');
  expect(config.sanitization.maskValue).toBe('[REDACTED_BY_TRACERCA]');
  expect(config.sanitization.sensitiveHeaders.length).toBeGreaterThanOrEqual(5);
  expect(config.sanitization.sensitiveKeys.length).toBeGreaterThanOrEqual(10);
  expect(config.analysis.maxAnalyses).toBe(5);
});
