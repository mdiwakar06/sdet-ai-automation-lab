/**
 * Gemini AI Loader & Client for DriftGuard
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

export interface GeminiClientOptions {
  apiKey?: string;
  modelName?: string;
}

export class AiClient {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor(options?: GeminiClientOptions) {
    const key = options?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    this.modelName = options?.modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
    } else {
      logger.debug('No GEMINI_API_KEY detected. AI Remediation will operate in rule-based heuristic fallback mode.');
    }
  }

  isAvailable(): boolean {
    return this.genAI !== null;
  }

  getModelName(): string {
    return this.modelName;
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API key is not configured.');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err: any) {
      logger.warn(`Gemini generation failed: ${err.message}. Falling back to heuristic remediation.`);
      throw err;
    }
  }
}

export const aiClient = new AiClient();
