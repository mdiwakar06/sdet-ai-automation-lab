import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getGeminiClient, getModelName } from '../utils/ai';
import { PersonaConfig, ChatMessage } from '../types';
import { logger } from '../utils/logger';

export class SimulatorAgent {
  private persona: PersonaConfig;
  private modelName: string;

  constructor(persona: PersonaConfig) {
    this.persona = persona;
    this.modelName = getModelName();
  }

  private formatHistory(history: ChatMessage[]): string {
    if (history.length === 0) {
      return '(No messages yet. This is the beginning of the conversation.)';
    }
    return history
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
  }

  async getNextMessage(history: ChatMessage[], currentTurn: number, maxTurns: number): Promise<string> {
    logger.info(`Simulator [${this.persona.name}] preparing message for turn ${currentTurn}/${maxTurns}...`);
    
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: this.modelName,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ]
    });

    const formattedHistory = this.formatHistory(history);

    // Build the prompt injecting current turn, max turns, persona rules, and history
    const prompt = `You are simulating a user interacting with a chatbot. You must adhere strictly to your assigned persona.

--- PERSONA DEFINITION ---
Name: ${this.persona.name}
Role & Description: ${this.persona.description}
Objective: ${this.persona.targetGoal}
Persona Instructions:
${this.persona.systemPrompt}
--------------------------

--- SIMULATION CONTEXT ---
Current Turn: ${currentTurn} of ${maxTurns}
Conversation History so far:
${formattedHistory}
--------------------------

--- GENERATION GUIDELINES ---
1. Generate the next message from the USER.
2. Stay strictly in character as ${this.persona.name}. Never admit you are an AI, a simulator, or executing a test.
3. Keep the target goal in mind: "${this.persona.targetGoal}". Keep driving the conversation towards this goal.
4. If you have reached close to the maximum turn limit (${maxTurns}), make a final, decisive effort to accomplish your goal.
5. Output ONLY the raw text to be typed in the chatbot message box.
6. Crucial: DO NOT wrap the output in quotes, code blocks, or include preambles (e.g. do NOT output: "User: [message]" or "Here is the next message: ..."). Just output the raw conversational message.

Next User Message:`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      // Clean up any accidental preambles if the model slipped up
      let cleanedText = text
        .replace(/^USER:\s*/i, '')
        .replace(/^User Message:\s*/i, '')
        .replace(/^["'](.*)["']$/s, '$1') // remove wrapping quotes if any
        .trim();

      if (!cleanedText) {
        throw new Error('Received empty response from Simulator model.');
      }

      logger.debug(`Simulator response generated: "${cleanedText.substring(0, 60)}${cleanedText.length > 60 ? '...' : ''}"`);
      return cleanedText;
    } catch (error) {
      logger.error(`Error generating simulator message for ${this.persona.name}:`, error);
      throw error;
    }
  }
}
