/**
 * AI-Powered Remediation & Patch Advisor for API Contract Drift
 */

import { DiffItem, RemediationPatch } from '../types/diff';
import { aiClient } from '../utils/ai';
import { logger } from '../utils/logger';

export class RemediationAdvisor {
  /**
   * Generates remediation recommendations and patches for detected contract diffs
   */
  async advise(diffs: DiffItem[]): Promise<RemediationPatch[]> {
    if (!diffs || diffs.length === 0) return [];

    const patches: RemediationPatch[] = [];

    // Filter to critical breaking and warning risk diffs
    const targetDiffs = diffs.filter((d) => d.severity !== 'NON_BREAKING_ADDITION');
    if (targetDiffs.length === 0) {
      return [];
    }

    if (aiClient.isAvailable()) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI Advisor request timed out after 5000ms')), 5000)
        );
        const aiPatches = await Promise.race([this.generateAiRemediations(targetDiffs), timeoutPromise]);
        return aiPatches;
      } catch (err: any) {
        logger.debug(`Falling back to heuristic remediation generator: ${err.message}`);
      }
    }

    // Heuristic generator fallback
    for (const diff of targetDiffs) {
      patches.push(this.generateHeuristicPatch(diff));
    }

    return patches;
  }

  private async generateAiRemediations(diffs: DiffItem[]): Promise<RemediationPatch[]> {
    const prompt = `You are a Principal API Architect and SDET. Analyze these API contract drift changes detected between a baseline OpenAPI specification and observed runtime traffic:

${JSON.stringify(diffs.slice(0, 10), null, 2)}

Provide a structured JSON response array of remediation patches with the following schema:
[
  {
    "diffId": "string (matching diff item id)",
    "ruleId": "string",
    "title": "string (concise summary)",
    "rootCause": "string (why this drift occurred)",
    "recommendedAction": "string (exact action for developers/SDETs)",
    "clientCompatibilityRisk": "HIGH" | "MEDIUM" | "LOW",
    "codeSnippetFix": "string (TypeScript or JSON patch fix)"
  }
]

Respond ONLY with valid JSON, with no markdown code blocks or additional conversational text.`;

    const rawResponse = await aiClient.generateContent(prompt);
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed: RemediationPatch[] = JSON.parse(cleaned);
    return parsed;
  }

  private generateHeuristicPatch(diff: DiffItem): RemediationPatch {
    let risk: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (diff.severity === 'CRITICAL_BREAKING') risk = 'HIGH';
    else if (diff.severity === 'NON_BREAKING_ADDITION') risk = 'LOW';

    let snippet = '';

    switch (diff.ruleId) {
      case 'BR-01': // Endpoint removed
        snippet = `// Restore endpoint in router or add redirection\napp.use('${diff.path}', (req, res) => {\n  res.status(301).redirect('/new-endpoint');\n});`;
        break;
      case 'BR-07': // Required response field removed
        snippet = `// Ensure response model includes default fallback\ninterface ResponseDTO {\n  // Required legacy field\n  ${diff.pointer.split('/').pop() || 'missingField'}: string | null;\n}`;
        break;
      case 'BR-10': // Field type changed
        snippet = `// Support union type or coerce incoming/outgoing types\nz.union([z.string(), z.number().transform(String)])`;
        break;
      case 'BR-15': // Required request field added
        snippet = `// Make property optional with default fallback on backend\nconst requestSchema = z.object({\n  ${diff.pointer.split('/').pop() || 'newField'}: z.string().optional().default('default_value'),\n});`;
        break;
      default:
        snippet = `// Review schema contract pointer: ${diff.pointer}\n// Expected: ${JSON.stringify(diff.expected)}\n// Observed: ${JSON.stringify(diff.actual)}`;
    }

    return {
      diffId: diff.id,
      ruleId: diff.ruleId,
      title: `${diff.ruleId}: ${diff.description}`,
      rootCause: `Divergence between baseline contract and runtime traffic at ${diff.pointer}.`,
      recommendedAction: diff.remediationAdvice || 'Update API schema definition or restore backward compatibility.',
      clientCompatibilityRisk: risk,
      codeSnippetFix: snippet,
    };
  }
}
