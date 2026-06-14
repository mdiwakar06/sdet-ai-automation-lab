import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import { SelectorConfig } from '../types';
import { logger } from '../utils/logger';

export class BrowserAutomator {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private selectorConfig: SelectorConfig;

  // Default fallback selectors if none are provided
  private defaultSelectors: Required<SelectorConfig> = {
    inputSelector: 'textarea, [role="textbox"], input[type="text"]',
    submitSelector: 'button[type="submit"], button:has-text("Send"), button:has-text("Submit"), [aria-label="Send message"]',
    messageSelector: '.chat-message, .message, [role="log"] > div, .message-bubble, .message-text',
    iframeSelector: '',
    typingIndicatorSelector: '.typing-indicator, .loading, [aria-busy="true"], .spinner, .dots-loading'
  };

  constructor(config?: SelectorConfig) {
    this.selectorConfig = { ...this.defaultSelectors, ...config };
  }

  async init(): Promise<void> {
    logger.info('Initializing BrowserAutomator (Playwright Chromium)...');
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create a completely isolated browser context (wipes cookies, storage, cache)
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    this.page = await this.context.newPage();
    logger.info('BrowserAutomator initialized successfully.');
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('BrowserAutomator not initialized. Call init() first.');
    logger.info(`Navigating to target chatbot URL: ${url}`);
    
    // Wait until network is somewhat idle or load event triggers
    await this.page.goto(url, { waitUntil: 'load', timeout: 30000 });
    // Additional wait for spa mounting
    await this.page.waitForTimeout(2000);
    logger.info('Navigation completed.');
  }

  private getRoot() {
    if (!this.page) throw new Error('BrowserAutomator not initialized.');
    if (this.selectorConfig.iframeSelector) {
      return this.page.frameLocator(this.selectorConfig.iframeSelector);
    }
    return this.page;
  }

  async getMessageCount(): Promise<number> {
    const root = this.getRoot();
    const selector = this.selectorConfig.messageSelector || this.defaultSelectors.messageSelector;
    const messages = root.locator(selector);
    try {
      return await messages.count();
    } catch (e) {
      return 0;
    }
  }

  async sendMessage(text: string): Promise<string> {
    if (!this.page) throw new Error('BrowserAutomator not initialized.');
    
    const root = this.getRoot();
    const inputSelector = this.selectorConfig.inputSelector || this.defaultSelectors.inputSelector;
    const submitSelector = this.selectorConfig.submitSelector || this.defaultSelectors.submitSelector;

    logger.info(`Sending message: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);

    // Ensure input is visible and active
    const inputLocator = root.locator(inputSelector).first();
    await inputLocator.waitFor({ state: 'visible', timeout: 10000 });
    
    // Get message count before sending, to track when new assistant bubble appears
    const initialCount = await this.getMessageCount();
    logger.debug(`Message count before send: ${initialCount}`);

    // Fill in the text
    await inputLocator.fill(text);
    await this.page.waitForTimeout(200);

    // Click submit
    const submitLocator = root.locator(submitSelector).first();
    if (await submitLocator.isVisible()) {
      await submitLocator.click();
    } else {
      // Fallback: Press Enter inside the textbox
      await inputLocator.press('Enter');
    }

    logger.debug('Message submitted. Waiting for streaming response...');

    // Perform Debounce Polling to wait for response to complete
    const responseText = await this.waitForResponse(initialCount);
    return responseText;
  }

  /**
   * Resilient Debounce Polling streaming response detector
   */
  private async waitForResponse(initialCount: number): Promise<string> {
    const root = this.getRoot();
    const messageSelector = this.selectorConfig.messageSelector || this.defaultSelectors.messageSelector;
    const indicatorSelector = this.selectorConfig.typingIndicatorSelector || this.defaultSelectors.typingIndicatorSelector;

    logger.debug('Waiting for typing indicator or new response bubble...');

    // 1. Indicator Check: Wait up to 1500ms for indicator to show up.
    // If it shows up, we wait for it to disappear.
    let indicatorAppeared = false;
    try {
      const indicator = root.locator(indicatorSelector).first();
      await indicator.waitFor({ state: 'visible', timeout: 1500 });
      indicatorAppeared = true;
      logger.debug('Typing indicator detected, waiting for it to disappear...');
      await indicator.waitFor({ state: 'hidden', timeout: 30000 });
      logger.debug('Typing indicator disappeared.');
    } catch (e) {
      logger.debug('No typing indicator detected within 1.5s, falling back to text stability polling.');
    }

    // 2. Text Stability Fallback: Poll the inner text of the latest message bubble.
    // We expect the count to be > initialCount. Let's wait for a new message bubble to appear.
    let latestBubble: Locator | null = null;
    const startTime = Date.now();
    const maxWaitTime = 20000; // 20s max wait for new bubble

    while (Date.now() - startTime < maxWaitTime) {
      const currentCount = await this.getMessageCount();
      if (currentCount > initialCount) {
        // Find the latest bubble
        latestBubble = root.locator(messageSelector).last();
        break;
      }
      await this.page!.waitForTimeout(200);
    }

    if (!latestBubble) {
      // Fallback to checking the last available bubble if no new bubble could be verified
      logger.warn('Could not verify new message bubble creation. Polling the last message element.');
      latestBubble = root.locator(messageSelector).last();
    }

    // Poll the latest message bubble for text stability
    logger.debug('Polling latest message bubble for text stability...');
    let lastText = '';
    let stableTicks = 0;
    const pollInterval = 200; // poll every 200ms
    const debounceTicksNeeded = 6; // 6 * 200ms = 1200ms debounce window
    const responseTimeout = 45000; // 45 seconds total timeout for response completion
    const pollStartTime = Date.now();

    while (Date.now() - pollStartTime < responseTimeout) {
      let currentText = '';
      try {
        currentText = (await latestBubble.innerText()).trim();
      } catch (e) {
        // If error (e.g. element detached temporarily during DOM re-render), skip this tick
        await this.page!.waitForTimeout(pollInterval);
        continue;
      }

      if (currentText.length > 0) {
        if (currentText === lastText) {
          stableTicks++;
          if (stableTicks >= debounceTicksNeeded) {
            logger.info(`Response stable. Length: ${currentText.length} chars.`);
            return currentText;
          }
        } else {
          // Reset stability counter since text is still growing/changing
          stableTicks = 0;
          lastText = currentText;
        }
      } else {
        // If text length is 0, we are still waiting for content to start streaming
        stableTicks = 0;
      }

      await this.page!.waitForTimeout(pollInterval);
    }

    // If we timed out but have some text, return it
    if (lastText) {
      logger.warn('Response stability timeout exceeded. Returning partially captured text.');
      return lastText;
    }

    throw new Error('Timeout waiting for chatbot response to start and stabilize.');
  }

  async extractFullTranscript(): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    if (!this.page) throw new Error('BrowserAutomator not initialized.');
    
    // If the custom UI requires complex parsing, we extract it.
    // In our orchestrator, we track the conversation history dynamically turn-by-turn.
    // But this method can read all current text contents of message bubbles.
    // We will extract inner text of message elements.
    const root = this.getRoot();
    const selector = this.selectorConfig.messageSelector || this.defaultSelectors.messageSelector;
    const locator = root.locator(selector);
    const count = await locator.count();
    
    const transcript: { role: 'user' | 'assistant'; content: string }[] = [];
    
    for (let i = 0; i < count; i++) {
      const text = (await locator.nth(i).innerText()).trim();
      // Simple heuristic if we don't know the role: alternate user and assistant
      // Or look at alignment/class names.
      // Since orchestrator builds the transcript turn-by-turn based on known events,
      // that is usually preferred, but this is a fallback.
      transcript.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: text
      });
    }
    
    return transcript;
  }

  async close(): Promise<void> {
    logger.info('Closing BrowserAutomator sessions...');
    try {
      if (this.page) await this.page.close().catch(() => {});
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } catch (e) {
      logger.error('Error during BrowserAutomator cleanup', e);
    } finally {
      this.page = null;
      this.context = null;
      this.browser = null;
    }
  }

  // Helper to take screenshots for troubleshooting or report inclusion
  async takeScreenshot(filePath: string): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.screenshot({ path: filePath, fullPage: true });
      logger.info(`Screenshot captured: ${filePath}`);
    } catch (e) {
      logger.error('Failed to capture screenshot', e);
    }
  }
}
