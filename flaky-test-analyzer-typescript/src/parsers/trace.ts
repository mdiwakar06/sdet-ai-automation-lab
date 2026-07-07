import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { RawDiagnosticContext, ActionLogEntry, ConsoleLogEntry, NetworkLogEntry } from '../types';

/**
 * Programmatically parses a Playwright trace.zip file and extracts diagnostic context.
 * If zip parsing fails, it gracefully falls back using test execution metadata.
 */
export async function parseTrace(
  traceZipPath: string,
  testId: string,
  testName: string,
  fallback?: {
    className?: string;
    filePath?: string;
    errorMessage?: string;
    stackTrace?: string;
  }
): Promise<RawDiagnosticContext> {
  const context: RawDiagnosticContext = {
    testId,
    testName,
    className: fallback?.className,
    filePath: fallback?.filePath,
    errorMessage: fallback?.errorMessage,
    stackTrace: fallback?.stackTrace,
    recentActions: [],
    consoleLogs: [],
    failedRequests: []
  };

  if (!fs.existsSync(traceZipPath)) {
    console.warn(`[TraceRCA] Warning: Trace file not found at ${traceZipPath}. Using stable fallback API logs.`);
    return context;
  }

  try {
    const zip = new AdmZip(traceZipPath);
    const zipEntries = zip.getEntries();

    // Locating core event files
    const traceEntry = zipEntries.find(e => e.entryName === 'trace.playwright-trace');
    const networkEntry = zipEntries.find(e => e.entryName === 'trace.network' || e.entryName === 'network.har');

    let rawEvents: any[] = [];
    if (traceEntry) {
      const traceContent = zip.readAsText(traceEntry);
      rawEvents = parseNdjson(traceContent);
    }

    let networkEvents: any[] = [];
    if (networkEntry) {
      const networkContent = zip.readAsText(networkEntry);
      if (networkEntry.entryName.endsWith('.har')) {
        try {
          const har = JSON.parse(networkContent);
          networkEvents = har.log?.entries || [];
        } catch (e) {
          // Ignore HAR parse failures
        }
      } else {
        networkEvents = parseNdjson(networkContent);
      }
    }

    // Process actions, console, and exceptions from trace.playwright-trace
    const actionList: ActionLogEntry[] = [];
    const consoleList: ConsoleLogEntry[] = [];
    const requestMap = new Map<string, any>(); // Map to correlate request/response pairs

    let stepCounter = 1;

    for (const event of rawEvents) {
      // 1. User actions (clicks, navigation, typing, etc.)
      if (event.type === 'action' || (event.type === 'event' && event.metadata?.apiName)) {
        const metadata = event.metadata || event;
        actionList.push({
          step: stepCounter++,
          action: metadata.apiName || metadata.type || 'unknown',
          selector: metadata.params?.selector,
          value: metadata.params?.value || metadata.params?.text,
          status: metadata.error ? 'failed' : 'passed',
          duration: metadata.duration
        });

        if (metadata.error) {
          context.failedAction = {
            name: metadata.apiName || 'unknown',
            selector: metadata.params?.selector,
            ordinal: stepCounter - 1
          };
          if (!context.errorMessage) {
            context.errorMessage = metadata.error.message || JSON.stringify(metadata.error);
          }
          if (!context.stackTrace && metadata.error.stack) {
            context.stackTrace = metadata.error.stack;
          }
        }
      }

      // 2. Console logs
      if (event.type === 'console' || event.type === 'log' || (event.method === 'Console.messageAdded')) {
        const text = event.text || event.params?.message?.text || '';
        const level = event.level || event.params?.message?.level || 'info';
        consoleList.push({
          level,
          text,
          timestamp: event.timestamp || event.params?.message?.timestamp
        });
      }

      // 3. Keep track of network requests recorded in trace logs if trace.network isn't separate
      if (event.type === 'resource-snapshot') {
        const guid = event.requestGuid || event.guid;
        if (guid) {
          requestMap.set(guid, event);
        }
      }
    }

    // Process network logs (from trace.network or raw HAR entries)
    const failedRequests: NetworkLogEntry[] = [];

    // Helper to resolve request/response body contents
    const getResponseBody = (resEvent: any): string | undefined => {
      // Check if body is inline
      if (resEvent.content?.text) return resEvent.content.text;
      if (resEvent.body) return resEvent.body;
      
      // Check if body is in resources folder
      const bodySha1 = resEvent.bodySha1 || resEvent.content?.sha1;
      if (bodySha1) {
        const bodyFile = zipEntries.find(e => e.entryName === `resources/${bodySha1}`);
        if (bodyFile) {
          try {
            return zip.readAsText(bodyFile);
          } catch (e) {
            // Ignore file read errors
          }
        }
      }
      return undefined;
    };

    // If we have separate trace.network logs or HAR
    if (networkEvents.length > 0) {
      for (const netEvent of networkEvents) {
        const request = netEvent.request;
        const response = netEvent.response;

        if (request && response) {
          const status = response.status;
          if (status >= 400) {
            failedRequests.push({
              url: request.url || 'unknown',
              method: request.method || 'GET',
              status,
              requestHeaders: parseHeaders(request.headers),
              requestBody: request.postData?.text || (typeof request.postData === 'string' ? request.postData : undefined),
              responseHeaders: parseHeaders(response.headers),
              responseBody: getResponseBody(response)
            });
          }
        } else if (netEvent.type === 'network' || netEvent.url) {
          const status = netEvent.response?.status || netEvent.status;
          if (status && status >= 400) {
            failedRequests.push({
              url: netEvent.request?.url || netEvent.url || 'unknown',
              method: netEvent.request?.method || netEvent.method || 'GET',
              status,
              requestHeaders: parseHeaders(netEvent.request?.headers || netEvent.headers),
              requestBody: netEvent.request?.postData || netEvent.postData || undefined,
              responseHeaders: parseHeaders(netEvent.response?.headers || netEvent.responseHeaders),
              responseBody: getResponseBody(netEvent.response || netEvent)
            });
          }
        }
      }
    } else {
      // Fallback: Intercept resource snapshot references in trace.playwright-trace
      for (const [guid, res] of requestMap.entries()) {
        const status = res.response?.status;
        if (status && status >= 400) {
          failedRequests.push({
            url: res.request?.url || res.url || 'unknown',
            method: res.request?.method || res.method || 'GET',
            status,
            requestHeaders: parseHeaders(res.request?.headers || res.headers),
            requestBody: res.request?.postData || res.postData || undefined,
            responseHeaders: parseHeaders(res.response?.headers || res.responseHeaders),
            responseBody: getResponseBody(res.response || res)
          });
        }
      }
    }

    // Populate context with extracted metrics (take last 10 actions to avoid overloading LLM tokens)
    context.recentActions = actionList.slice(-10);
    context.consoleLogs = consoleList.slice(-20); // Last 20 logs
    context.failedRequests = failedRequests;

  } catch (error) {
    console.warn(`[TraceRCA] Error parsing trace file: ${error}. Falling back to stable test failure metadata.`);
  }

  return context;
}

/**
 * Parses newline delimited JSON (NDJSON) string
 */
function parseNdjson(content: string): any[] {
  const list: any[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      try {
        list.push(JSON.parse(line));
      } catch (e) {
        // Skip malformed lines
      }
    }
  }
  return list;
}

/**
 * Helper to convert both HAR style (array) and Playwright style (object) headers into a standardized Record
 */
function parseHeaders(headers: any): Record<string, string> {
  if (!headers) return {};
  const result: Record<string, string> = {};

  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (h.name && h.value) {
        result[h.name.toLowerCase()] = h.value;
      }
    }
  } else if (typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') {
        result[k.toLowerCase()] = v;
      } else if (v !== null && v !== undefined) {
        result[k.toLowerCase()] = String(v);
      }
    }
  }

  return result;
}
