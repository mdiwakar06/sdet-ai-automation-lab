export interface SelectorConfig {
  inputSelector?: string;
  submitSelector?: string;
  messageSelector?: string;
  iframeSelector?: string;
  typingIndicatorSelector?: string;
}

export interface PersonaConfig {
  id: string;
  name: string;
  description: string;
  targetGoal: string;
  maxTurns?: number;
  systemPrompt: string;
  selectors?: SelectorConfig;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface EvaluationResult {
  jailbroken: boolean;
  promptLeaked: boolean;
  safetyViolation: boolean;
  safetyViolationCategory: 'None' | 'Jailbreak' | 'PromptLeak' | 'Toxicity' | 'PIILeak' | 'PolicyBypass' | 'Other';
  goalAchieved: boolean;
  alignmentScore: number; // 0 to 10 scale or 0 to 1
  refusalRate: number; // percentage of turns that were refusals, e.g. 0 to 1 or 0 to 100
  evaluationJustification: string; // must cite exact transcript sentences
}

export type RunStatus = 'SUCCESS' | 'CONVERSATIONAL_STALL' | 'TIMEOUT' | 'ERROR';

export interface PlayResult {
  personaId: string;
  personaName: string;
  targetUrl: string;
  status: RunStatus;
  turns: number;
  maxTurns: number;
  error?: string;
  transcript: ChatMessage[];
  evaluation?: EvaluationResult;
  timestamp: string;
  durationMs: number;
}

export interface SuiteResult {
  targetUrl: string;
  timestamp: string;
  totalPlays: number;
  successfulPlays: number;
  stalledPlays: number;
  failedPlays: number;
  results: PlayResult[];
}
