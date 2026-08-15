/**
 * SynthDB - AI Service Loader with Heuristic Fallback
 */

let GoogleGenerativeAI: any = null;
try {
  const genAiModule = require('@google/generative-ai');
  GoogleGenerativeAI = genAiModule.GoogleGenerativeAI;
} catch {
  // Graceful fallback if @google/generative-ai is not installed
}

export class AiClient {
  private static instance: any = null;

  public static getModel(apiKey?: string, modelName: string = 'gemini-2.5-flash'): any | null {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key || !GoogleGenerativeAI) {
      return null;
    }

    try {
      if (!this.instance) {
        const client = new GoogleGenerativeAI(key);
        this.instance = client.getGenerativeModel({ model: modelName });
      }
      return this.instance;
    } catch {
      return null;
    }
  }

  public static isAvailable(apiKey?: string): boolean {
    const key = apiKey || process.env.GEMINI_API_KEY;
    return Boolean(key && GoogleGenerativeAI);
  }
}
