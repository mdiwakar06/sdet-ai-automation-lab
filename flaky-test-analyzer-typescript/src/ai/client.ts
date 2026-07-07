import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { RawDiagnosticContext, AIAnalysisResult, TraceRCAConfig } from '../types';

// Load environment variables (useful for local runs loading from .env)
dotenv.config();

/**
 * Compiles a structured, context-rich prompt for Gemini based on sanitized diagnostics
 */
export function compilePrompt(context: RawDiagnosticContext): string {
  const actionsStr = context.recentActions.length > 0
    ? context.recentActions.map(a => `Step ${a.step}: ${a.action} ${a.selector ? `on ${a.selector}` : ''} ${a.value ? `with value "${a.value}"` : ''} -> Status: ${a.status}`).join('\n')
    : 'No action history captured.';

  const consoleStr = context.consoleLogs.length > 0
    ? context.consoleLogs.map(c => `[${c.level.toUpperCase()}] ${c.text}`).join('\n')
    : 'No browser console logs captured.';

  const networkStr = context.failedRequests.length > 0
    ? context.failedRequests.map(r => 
        `API Call: ${r.method} ${r.url}\n` +
        `Status: ${r.status}\n` +
        `Headers: ${JSON.stringify(r.responseHeaders || {})}\n` +
        `ResponseBody: ${r.responseBody || 'None'}`
      ).join('\n---\n')
    : 'No failed network requests detected.';

  const stackTraceStr = context.stackTrace
    ? (context.stackTrace.length > 1000 ? context.stackTrace.substring(0, 1000) + '...' : context.stackTrace)
    : 'No stack trace available.';

  return `
You are TraceRCA, an expert automated QA Failure Investigator and Root-Cause Analyzer.
Your task is to analyze the provided diagnostic telemetry from a failed E2E test run and classify the failure.

### System Classification Definitions
- 'App Bug': The application under test is behaving incorrectly (e.g. backend API failed with 500, dynamic state validation failed, application crashed on uncaught runtime exception).
- 'Test Bug': The test code itself is fragile, outdated, or written incorrectly (e.g. selector was not found due to a DOM rename, the test script did not wait for elements to be interactive before clicking, assertion is testing the wrong value).
- 'Infra Flake': The environment or network has degraded (e.g. socket timeout, microservice request timed out, third-party provider returned 502/504 gateway timeout, browser process crashed).

### Diagnostic Telemetry
- Test Name: ${context.testName}
- Test Suite: ${context.filePath || 'Unknown'}
- Error Stack: ${context.errorMessage || 'No error message available.'}
- Stack Trace: ${stackTraceStr}
- Failed Step: ${context.failedAction ? `Action "${context.failedAction.name}" on selector "${context.failedAction.selector || 'None'}"` : 'None'}

---
[User Action Trail]
${actionsStr}

---
[Console Logs]
${consoleStr}

---
[Failed Network Requests]
${networkStr}
---

Provide your diagnostic output strictly in accordance with the requested JSON schema structure.
`;
}

/**
 * Invokes the Gemini API to analyze a test failure
 */
export async function analyzeFailure(
  context: RawDiagnosticContext,
  config: TraceRCAConfig
): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.TRACERCA_API_KEY;

  if (!apiKey) {
    throw new Error(
      '[TraceRCA] Error: GEMINI_API_KEY environment variable is not defined. ' +
      'Please export it in your terminal (e.g., export GEMINI_API_KEY="...") or configure it in a .env file.'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // We use gemini-1.5-flash as the fast, cost-effective default model
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = compilePrompt(context);

  // Defining the JSON schema structure required by the Gemini API
  const responseSchema: any = {
    type: SchemaType.OBJECT,
    properties: {
      classification: {
        type: SchemaType.STRING,
        enum: ['App Bug', 'Test Bug', 'Infra Flake'],
        description: 'The root cause category of the test failure.'
      },
      confidence: {
        type: SchemaType.STRING,
        enum: ['High', 'Medium', 'Low'],
        description: 'Your confidence score in this diagnostic classification.'
      },
      summary: {
        type: SchemaType.STRING,
        description: 'A concise, 1-sentence explanation of the root cause.'
      },
      detailedAnalysis: {
        type: SchemaType.STRING,
        description: 'Detailed analysis detailing step-by-step why the test failed based on action trails, console logs, or network requests.'
      },
      recommendedFix: {
        type: SchemaType.STRING,
        description: 'Actionable steps for the developer or SDET to resolve the issue.'
      }
    },
    required: ['classification', 'confidence', 'summary', 'detailedAnalysis', 'recommendedFix']
  };

  // Perform the API call with exponential backoff retries for robustness
  const maxRetries = 3;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      });

      const responseText = result.response.text();
      const parsed: AIAnalysisResult = JSON.parse(responseText);

      // Simple runtime validation of properties
      if (!parsed.classification || !parsed.confidence || !parsed.summary) {
        throw new Error('Received incomplete response structure from Gemini API');
      }

      return parsed;
    } catch (error: any) {
      console.warn(`[TraceRCA] AI analysis attempt ${attempt} failed: ${error.message || error}`);

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff delay
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error('[TraceRCA] Unexpected flow termination in AI analysis client');
}
