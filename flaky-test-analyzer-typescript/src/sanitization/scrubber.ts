import * as fs from 'fs';
import * as path from 'path';
import { RawDiagnosticContext, ScrubberConfig, TraceRCAConfig } from '../types';

const DEFAULT_CONFIG: TraceRCAConfig = {
  sanitization: {
    maskValue: "[REDACTED_BY_TRACERCA]",
    sensitiveHeaders: [
      "authorization",
      "cookie",
      "set-cookie",
      "x-api-key",
      "x-session-token",
      "proxy-authorization",
      "apikey",
      "api-key"
    ],
    sensitiveKeys: [
      "password",
      "pwd",
      "token",
      "secret",
      "cvv",
      "creditcard",
      "ssn",
      "email",
      "username",
      "passphrase",
      "key",
      "apikey",
      "api_key"
    ],
    customRegexPatterns: [
      {
        name: "Email Address",
        pattern: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
        replacement: "[EMAIL_REDACTED]"
      },
      {
        name: "Bearer JWT Token",
        pattern: "bearer\\s+[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*",
        replacement: "Bearer [JWT_REDACTED]"
      },
      {
        name: "Credit Card",
        pattern: "\\b(?:\\d[ -]*?){13,16}\\b",
        replacement: "[CREDIT_CARD_REDACTED]"
      }
    ]
  },
  analysis: {
    maxAnalyses: 5
  }
};

/**
 * Load configuration file from workspace root
 */
export function loadConfig(configPath?: string): TraceRCAConfig {
  const targetPath = configPath || path.join(process.cwd(), 'tracerca.config.json');
  try {
    if (fs.existsSync(targetPath)) {
      const data = fs.readFileSync(targetPath, 'utf8');
      const parsed = JSON.parse(data);
      return {
        sanitization: {
          ...DEFAULT_CONFIG.sanitization,
          ...parsed.sanitization
        },
        analysis: {
          ...DEFAULT_CONFIG.analysis,
          ...parsed.analysis
        }
      };
    }
  } catch (e) {
    console.error(`[TraceRCA] Warning: Failed to load config at ${targetPath}. Using defaults.`, e);
  }
  return DEFAULT_CONFIG;
}

/**
 * Sanitizes URLs by redacting sensitive query parameters
 */
export function sanitizeUrl(urlStr: string, config: ScrubberConfig): string {
  try {
    const url = new URL(urlStr);
    let updated = false;
    url.searchParams.forEach((value, key) => {
      const keyLower = key.toLowerCase();
      if (config.sensitiveKeys.some(sk => keyLower.includes(sk.toLowerCase()))) {
        url.searchParams.set(key, config.maskValue);
        updated = true;
      }
    });
    return updated ? url.toString() : urlStr;
  } catch (e) {
    // Relative URL fallback
    let scrubbed = urlStr;
    for (const key of config.sensitiveKeys) {
      const regex = new RegExp(`([?&])${key}=([^&]*)`, 'gi');
      scrubbed = scrubbed.replace(regex, `$1${key}=${config.maskValue}`);
    }
    return scrubbed;
  }
}

/**
 * Replaces patterns matches in unstructured text using local configuration patterns
 */
export function sanitizeText(text: string | undefined, config: ScrubberConfig): string | undefined {
  if (!text) return text;
  let scrubbed = text;
  for (const patternObj of config.customRegexPatterns) {
    try {
      const regex = new RegExp(patternObj.pattern, 'gi');
      scrubbed = scrubbed.replace(regex, patternObj.replacement);
    } catch (e) {
      // Ignore invalid regex patterns
    }
  }
  return scrubbed;
}

/**
 * Recursively traverses a JSON object, redacting sensitive keys (AST Scrubbing)
 */
export function traverseAndMask(obj: any, config: ScrubberConfig): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => traverseAndMask(item, config));
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const keyLower = key.toLowerCase();
      const shouldRedact = config.sensitiveKeys.some(sk => keyLower.includes(sk.toLowerCase()));
      if (shouldRedact) {
        result[key] = config.maskValue;
      } else {
        result[key] = traverseAndMask(value, config);
      }
    }
    return result;
  }
  if (typeof obj === 'string') {
    return sanitizeText(obj, config);
  }
  return obj;
}

/**
 * Parses a payload as JSON or falls back to regex-based text scrubbing
 */
export function sanitizeBody(body: string | undefined, config: ScrubberConfig): string | undefined {
  if (!body) return body;
  try {
    const parsed = JSON.parse(body);
    const scrubbedObj = traverseAndMask(parsed, config);
    return JSON.stringify(scrubbedObj);
  } catch (e) {
    // Unstructured text fallback
    return sanitizeText(body, config);
  }
}

/**
 * Sanitizes HTTP Headers dictionary
 */
export function sanitizeHeaders(headers: Record<string, string> | undefined, config: ScrubberConfig): Record<string, string> {
  if (!headers) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const keyLower = key.toLowerCase();
    if (
      config.sensitiveHeaders.includes(keyLower) ||
      config.sensitiveKeys.some(sk => keyLower.includes(sk.toLowerCase()))
    ) {
      result[key] = config.maskValue;
    } else {
      result[key] = sanitizeText(value, config) || '';
    }
  }
  return result;
}

/**
 * Cleanse diagnostic payload context before externalizing to an AI model
 */
export function sanitizeContext(context: RawDiagnosticContext, config: ScrubberConfig): RawDiagnosticContext {
  return {
    testId: context.testId,
    testName: context.testName,
    className: context.className,
    filePath: context.filePath,
    errorMessage: sanitizeText(context.errorMessage, config),
    stackTrace: sanitizeText(context.stackTrace, config),
    failedAction: context.failedAction ? {
      name: context.failedAction.name,
      selector: sanitizeText(context.failedAction.selector, config),
      ordinal: context.failedAction.ordinal
    } : undefined,
    recentActions: context.recentActions.map(action => ({
      ...action,
      value: sanitizeText(action.value, config),
      selector: sanitizeText(action.selector, config)
    })),
    consoleLogs: context.consoleLogs.map(log => ({
      ...log,
      text: sanitizeText(log.text, config) || ''
    })),
    failedRequests: context.failedRequests.map(req => ({
      url: sanitizeUrl(req.url, config),
      method: req.method,
      status: req.status,
      requestHeaders: sanitizeHeaders(req.requestHeaders, config),
      requestBody: sanitizeBody(req.requestBody, config),
      responseHeaders: sanitizeHeaders(req.responseHeaders, config),
      responseBody: sanitizeBody(req.responseBody, config)
    }))
  };
}
