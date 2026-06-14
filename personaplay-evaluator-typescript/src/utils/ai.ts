import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables
dotenv.config();

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (genAI) {
    return genAI;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY is not defined in the environment variables.');
    throw new Error('GEMINI_API_KEY is missing. Please set it in your environment or a .env file.');
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

export function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}
