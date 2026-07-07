import * as fs from 'fs';
import * as path from 'path';
import { BrowserAutomator } from './BrowserAutomator';
import { SimulatorAgent } from './SimulatorAgent';
import { EvaluatorJudge } from './EvaluatorJudge';
import { PersonaConfig, ChatMessage, PlayResult, EvaluationResult, RunStatus } from '../types';
import { logger } from '../utils/logger';

export class PlayOrchestrator {
  private persona: PersonaConfig;
  private targetUrl: string;
  private outputDir: string;

  constructor(persona: PersonaConfig, targetUrl: string, outputDir?: string) {
    this.persona = persona;
    this.targetUrl = targetUrl;
    this.outputDir = outputDir || path.resolve(process.cwd(), 'reports');
  }

  private calculateJaccardSimilarity(s1: string, s2: string): number {
    const getTokens = (str: string) => {
      return new Set(
        str
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((word) => word.length > 0)
      );
    };
    const set1 = getTokens(s1);
    const set2 = getTokens(s2);
    
    if (set1.size === 0 && set2.size === 0) return 1.0;
    if (set1.size === 0 || set2.size === 0) return 0.0;
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  async run(): Promise<PlayResult> {
    const startTime = Date.now();
    logger.info(`Starting evaluation play: [Persona: ${this.persona.name}] [Target: ${this.targetUrl}]`);
    
    const automator = new BrowserAutomator(this.persona.selectors);
    const simulator = new SimulatorAgent(this.persona);
    const judge = new EvaluatorJudge();
    
    const transcript: ChatMessage[] = [];
    const maxTurns = this.persona.maxTurns || 8;
    let status: RunStatus = 'SUCCESS';
    let errorMsg: string | undefined;
    const matchHistory: boolean[] = [];

    try {
      // 1. Initialize browser
      await automator.init();
      await automator.navigate(this.targetUrl);

      // 2. Chat loop
      for (let turn = 1; turn <= maxTurns; turn++) {
        // A. Ask simulator for next user message
        const userMessageContent = await simulator.getNextMessage(transcript, turn, maxTurns);
        
        const userTimestamp = new Date().toLocaleTimeString();
        transcript.push({
          role: 'user',
          content: userMessageContent,
          timestamp: userTimestamp
        });

        // B. Send message to browser UI and wait for response using Debounce Polling
        const assistantResponseContent = await automator.sendMessage(userMessageContent);
        
        const assistantTimestamp = new Date().toLocaleTimeString();
        transcript.push({
          role: 'assistant',
          content: assistantResponseContent,
          timestamp: assistantTimestamp
        });

        logger.info(`Turn ${turn} complete. Received assistant reply (${assistantResponseContent.length} chars).`);

        // C. Jaccard Similarity Repetition Loop Check
        const assistantResponses = transcript
          .filter((msg) => msg.role === 'assistant')
          .map((msg) => msg.content);

        if (assistantResponses.length > 0) {
          const currentResponse = assistantResponses[assistantResponses.length - 1];
          const previousResponses = assistantResponses.slice(-4, -1); // Up to 3 previous responses

          let hasMatch = false;
          for (const prev of previousResponses) {
            const similarity = this.calculateJaccardSimilarity(prev, currentResponse);
            logger.info(`Jaccard similarity with a previous assistant reply: ${(similarity * 100).toFixed(1)}%`);
            if (similarity >= 0.90) {
              hasMatch = true;
              break;
            }
          }

          matchHistory.push(hasMatch);

          // Check if any match exceeds 90% twice in a short span (last 3 turns)
          const span = 3;
          const recentMatches = matchHistory.slice(-span);
          const matchCount = recentMatches.filter(m => m).length;

          if (matchCount >= 2) {
            logger.warn(`CONVERSATIONAL_STALL detected: ${matchCount} matches of >90% similarity in the last ${span} turns.`);
            status = 'CONVERSATIONAL_STALL';
            break;
          }
        }
      }
    } catch (error: any) {
      status = 'ERROR';
      errorMsg = error.message || String(error);
      logger.error(`Error during conversational play execution:`, error);
      
      // Capture screenshot on error for debugging
      try {
        if (!fs.existsSync(this.outputDir)) {
          fs.mkdirSync(this.outputDir, { recursive: true });
        }
        const screenshotPath = path.join(this.outputDir, `error-${this.persona.id}-${Date.now()}.png`);
        await automator.takeScreenshot(screenshotPath);
      } catch (screenshotErr) {
        logger.error('Failed to capture error screenshot:', screenshotErr);
      }
    } finally {
      // Ensure browser is closed
      await automator.close();
    }

    const durationMs = Date.now() - startTime;
    logger.info(`Conversation loop finished in ${(durationMs / 1000).toFixed(1)}s. Status: ${status}`);

    // 3. Post-conversation Compliance Audit by Judge
    let evaluation: EvaluationResult | undefined;
    if (transcript.length > 0) {
      try {
        evaluation = await judge.auditConversation(transcript, this.persona.targetGoal);
      } catch (evalError) {
        logger.error('Evaluator Judge failed to audit conversation:', evalError);
      }
    } else {
      logger.warn('Empty transcript, skipping LLM evaluation audit.');
    }

    // 4. Compile PlayResult
    const playResult: PlayResult = {
      personaId: this.persona.id,
      personaName: this.persona.name,
      targetUrl: this.targetUrl,
      status,
      turns: Math.ceil(transcript.length / 2),
      maxTurns,
      error: errorMsg,
      transcript,
      evaluation,
      timestamp: new Date().toISOString(),
      durationMs
    };

    // 5. Save Report Outputs
    this.saveReports(playResult);

    return playResult;
  }

  private saveReports(result: PlayResult): void {
    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      // Save JSON
      const jsonFilename = `report-${result.personaId}-${Date.now()}.json`;
      const jsonPath = path.join(this.outputDir, jsonFilename);
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
      logger.info(`Saved JSON report to: ${jsonPath}`);

      // Save HTML
      const htmlFilename = `report-${result.personaId}-${Date.now()}.html`;
      const htmlPath = path.join(this.outputDir, htmlFilename);
      const htmlContent = this.generateHtmlReport(result);
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      logger.info(`Saved HTML Dashboard to: ${htmlPath}`);
    } catch (e) {
      logger.error('Failed to save report files:', e);
    }
  }

  private generateHtmlReport(result: PlayResult): string {
    const transcriptHtml = result.transcript
      .map((msg) => {
        const isUser = msg.role === 'user';
        const bubbleClass = isUser ? 'user-bubble' : 'bot-bubble';
        const alignClass = isUser ? 'justify-end' : 'justify-start';
        const bgClass = isUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800';
        const name = isUser ? result.personaName : 'Chatbot';
        
        return `
          <div class="flex ${alignClass} mb-4">
            <div class="max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${bgClass}">
              <div class="text-xs font-bold opacity-75 mb-1">${name} (${msg.timestamp})</div>
              <div class="text-sm whitespace-pre-wrap">${this.escapeHtml(msg.content)}</div>
            </div>
          </div>
        `;
      })
      .join('');

    const evalSection = result.evaluation
      ? `
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <h2 class="text-xl font-semibold text-gray-900 border-b pb-3 mb-4">⚖️ Evaluator Judge Audit Report</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div class="p-3 border rounded text-center">
              <span class="block text-xs font-medium text-gray-500 uppercase">Jailbroken</span>
              <span class="text-lg font-bold ${result.evaluation.jailbroken ? 'text-red-600' : 'text-green-600'}">
                ${result.evaluation.jailbroken ? 'YES 🚨' : 'NO ✅'}
              </span>
            </div>
            <div class="p-3 border rounded text-center">
              <span class="block text-xs font-medium text-gray-500 uppercase">Prompt Leaked</span>
              <span class="text-lg font-bold ${result.evaluation.promptLeaked ? 'text-red-600' : 'text-green-600'}">
                ${result.evaluation.promptLeaked ? 'YES 🚨' : 'NO ✅'}
              </span>
            </div>
            <div class="p-3 border rounded text-center">
              <span class="block text-xs font-medium text-gray-500 uppercase">Goal Achieved</span>
              <span class="text-lg font-bold ${result.evaluation.goalAchieved ? 'text-indigo-600' : 'text-gray-600'}">
                ${result.evaluation.goalAchieved ? 'YES 🎯' : 'NO ❌'}
              </span>
            </div>
            <div class="p-3 border rounded text-center">
              <span class="block text-xs font-medium text-gray-500 uppercase">Alignment Score</span>
              <span class="text-lg font-bold text-gray-900">
                ${(result.evaluation.alignmentScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span class="block text-xs font-medium text-gray-500 uppercase">Safety Violation Category</span>
              <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                result.evaluation.safetyViolation ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }">
                ${result.evaluation.safetyViolationCategory}
              </span>
            </div>
            <div>
              <span class="block text-xs font-medium text-gray-500 uppercase">Refusal Rate</span>
              <span class="text-sm font-semibold text-gray-800">
                ${(result.evaluation.refusalRate * 100).toFixed(0)}% of responses
              </span>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t">
            <h3 class="text-sm font-medium text-gray-900 mb-2">Audit Justification & Citations</h3>
            <p class="text-sm text-gray-600 italic bg-gray-50 p-4 rounded border border-dashed whitespace-pre-wrap">${this.escapeHtml(
              result.evaluation.evaluationJustification
            )}</p>
          </div>
        </div>
      `
      : `
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">⚠️</div>
            <div class="ml-3">
              <p class="text-sm text-yellow-700">No evaluation audit report is available for this run.</p>
            </div>
          </div>
        </div>
      `;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PersonaPlay Report: ${result.personaName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 min-h-screen font-sans">
        <div class="max-w-5xl mx-auto py-8 px-4">
          <!-- Header -->
          <div class="bg-white rounded-lg shadow p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">🎭 PersonaPlay Run Dashboard</h1>
              <p class="text-sm text-gray-500">Evaluated target: <a href="${result.targetUrl}" target="_blank" class="text-indigo-600 hover:underline">${result.targetUrl}</a></p>
            </div>
            <div class="mt-4 md:mt-0 flex flex-col items-end">
              <span class="px-3 py-1 rounded-full text-xs font-bold ${
                result.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                result.status === 'CONVERSATIONAL_STALL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }">${result.status}</span>
              <span class="text-xs text-gray-400 mt-1">${result.timestamp}</span>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white rounded-lg shadow p-6 col-span-2">
              <h2 class="text-lg font-semibold text-gray-900 mb-3">Persona: ${result.personaName}</h2>
              <p class="text-sm text-gray-600 mb-2"><strong>Description:</strong> ${this.persona.description}</p>
              <p class="text-sm text-gray-600"><strong>Target Goal:</strong> ${this.persona.targetGoal}</p>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-3">Session Stats</h2>
              <ul class="text-sm text-gray-600 space-y-2">
                <li><strong>Turns:</strong> ${result.turns} / ${result.maxTurns}</li>
                <li><strong>Duration:</strong> ${(result.durationMs / 1000).toFixed(1)}s</li>
                ${result.error ? `<li class="text-red-600"><strong>Error:</strong> ${this.escapeHtml(result.error)}</li>` : ''}
              </ul>
            </div>
          </div>

          <!-- Evaluation Section -->
          ${evalSection}

          <!-- Chat Transcript -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 border-b pb-3 mb-4">💬 Chat Transcript</h2>
            <div class="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              ${transcriptHtml}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
