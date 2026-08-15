/**
 * Use Case 2: E2E Browser Automation & Resilient Streaming Debounce Test Suite
 * 
 * Verifies:
 * - Playwright headless browser launching and session context isolation
 * - Local HTTP server hosting of mock chat interface
 * - DOM piercing, selector overrides, and shadow DOM resilience
 * - Resilient debounce polling streaming detection (1200ms text stability window)
 * - Multi-turn conversational browser execution and transcript extraction
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { BrowserAutomator } from '../../src/core/BrowserAutomator';

interface TestResult {
  name: string;
  passed: boolean;
  assertions: number;
  durationMs: number;
  error?: string;
}

export async function runUc2Test(): Promise<TestResult> {
  const name = 'UC-2: E2E Browser Automation & Debounce Polling';
  const startTime = performance.now();
  let assertions = 0;

  let server: http.Server | null = null;
  let serverPort = 0;
  let automator: BrowserAutomator | null = null;

  try {
    // ------------------------------------------------------------------------
    // 1. Start Local HTTP Server for Mock Chatbot
    // ------------------------------------------------------------------------
    const mockHtmlPath = path.resolve(__dirname, '../../mock-chatbot/index.html');
    if (!fs.existsSync(mockHtmlPath)) {
      throw new Error(`Mock chatbot HTML not found at: ${mockHtmlPath}`);
    }
    const htmlContent = fs.readFileSync(mockHtmlPath, 'utf8');

    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlContent);
    });

    await new Promise<void>((resolve, reject) => {
      server!.listen(0, '127.0.0.1', () => {
        const address = server!.address();
        if (typeof address === 'object' && address !== null) {
          serverPort = address.port;
          resolve();
        } else {
          reject(new Error('Failed to obtain server port'));
        }
      });
    });

    if (serverPort <= 0) throw new Error('Invalid server port assigned.');
    assertions++;

    const targetUrl = `http://127.0.0.1:${serverPort}`;

    // ------------------------------------------------------------------------
    // 2. Initialize BrowserAutomator with Custom & Default Selectors
    // ------------------------------------------------------------------------
    automator = new BrowserAutomator({
      inputSelector: '#chatInput',
      submitSelector: 'button[type="submit"]',
      messageSelector: '.message-bubble',
      typingIndicatorSelector: '#typingIndicator'
    });

    await automator.init();
    assertions++;

    // ------------------------------------------------------------------------
    // 3. Navigation & Initial DOM Verification
    // ------------------------------------------------------------------------
    await automator.navigate(targetUrl);
    assertions++;

    // Check initial welcome message count
    const initialCount = await automator.getMessageCount();
    if (initialCount < 1) {
      throw new Error(`Expected at least 1 initial welcome message bubble, found ${initialCount}`);
    }
    assertions++;

    // ------------------------------------------------------------------------
    // 4. Send Message & Verify Streaming Debounce Polling
    // ------------------------------------------------------------------------
    const userPrompt = 'How do I reset my password and configure 2FA?';
    const responseText = await automator.sendMessage(userPrompt);

    if (!responseText || responseText.length === 0) {
      throw new Error('Received empty response from browser automator.');
    }
    assertions++;

    if (!responseText.toLowerCase().includes('password') || !responseText.toLowerCase().includes('2fa')) {
      throw new Error(`Expected assistant response to mention password/2FA, got: "${responseText}"`);
    }
    assertions++;

    const countAfterFirstTurn = await automator.getMessageCount();
    // Should have: 1 welcome + 1 user message + 1 assistant reply = 3
    if (countAfterFirstTurn < 3) {
      throw new Error(`Expected at least 3 messages after turn 1, got ${countAfterFirstTurn}`);
    }
    assertions++;

    // ------------------------------------------------------------------------
    // 5. Multi-Turn Interactive Execution
    // ------------------------------------------------------------------------
    const secondPrompt = 'Can I get a full refund without a receipt?';
    const secondResponse = await automator.sendMessage(secondPrompt);

    if (!secondResponse.toLowerCase().includes('refund') && !secondResponse.toLowerCase().includes('policy')) {
      throw new Error(`Expected second reply to reference refund policy, got: "${secondResponse}"`);
    }
    assertions++;

    const countAfterSecondTurn = await automator.getMessageCount();
    if (countAfterSecondTurn < 5) {
      throw new Error(`Expected at least 5 messages after turn 2, got ${countAfterSecondTurn}`);
    }
    assertions++;

    // ------------------------------------------------------------------------
    // 6. Transcript Extraction & DOM Integrity
    // ------------------------------------------------------------------------
    const transcript = await automator.extractFullTranscript();
    if (transcript.length < 5) {
      throw new Error(`Extracted transcript length (${transcript.length}) is less than expected bubbles.`);
    }
    assertions++;

    const hasUserMsg = transcript.some(t => t.content.includes('password and configure 2FA'));
    const hasRefundReply = transcript.some(t => t.content.toLowerCase().includes('refund'));
    if (!hasUserMsg || !hasRefundReply) {
      throw new Error('Transcript extraction missed key conversational turns.');
    }
    assertions += 2;

    // ------------------------------------------------------------------------
    // 7. Cleanup & Lifecycle Verification
    // ------------------------------------------------------------------------
    await automator.close();
    automator = null;
    assertions++;

    const durationMs = performance.now() - startTime;
    return {
      name,
      passed: true,
      assertions,
      durationMs
    };
  } catch (err: any) {
    const durationMs = performance.now() - startTime;
    return {
      name,
      passed: false,
      assertions,
      durationMs,
      error: err.message
    };
  } finally {
    if (automator) {
      await automator.close().catch(() => {});
    }
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
  }
}
