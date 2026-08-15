/**
 * SynthDB - AI Contextual Advisor
 * Leverages Gemini 2.5 Flash to synthesize domain-specific vocabulary and rich sample pools.
 */

import { AiClient } from '../utils/ai';
import { Logger } from '../utils/logger';
import { TableDefinition } from '../types';

export interface DomainSuggestions {
  tableDescriptions: Record<string, string>;
  domainVocabularies: Record<string, string[]>;
}

export class ContextualAdvisor {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generates domain suggestions for tables
   */
  public async adviseSchema(tables: TableDefinition[]): Promise<DomainSuggestions> {
    const fallback = this.getHeuristicSuggestions(tables);
    const model = AiClient.getModel(this.apiKey);

    if (!model) {
      Logger.debug('Gemini API key not configured or offline; using rich heuristic semantic pools.');
      return fallback;
    }

    try {
      const tableSummary = tables.map(t => ({
        table: t.name,
        columns: t.columns.map(c => `${c.name} (${c.rawType})`)
      }));

      const prompt = `You are a database domain expert. Given these SQL tables:
${JSON.stringify(tableSummary, null, 2)}

Provide a JSON response (and ONLY JSON, no markdown tags) with:
1. "tableDescriptions": mapping table name to a concise 1-sentence description.
2. "domainVocabularies": mapping table.column (e.g. "products.name" or "projects.title") to an array of 15 realistic domain strings.`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        tableDescriptions: { ...fallback.tableDescriptions, ...parsed.tableDescriptions },
        domainVocabularies: { ...fallback.domainVocabularies, ...parsed.domainVocabularies }
      };
    } catch (err: any) {
      Logger.debug(`AI advice generation failed: ${err.message}. Falling back to heuristics.`);
      return fallback;
    }
  }

  /**
   * Rich heuristic domain pool fallback
   */
  public getHeuristicSuggestions(tables: TableDefinition[]): DomainSuggestions {
    const tableDescriptions: Record<string, string> = {};
    const domainVocabularies: Record<string, string[]> = {
      'categories.name': [
        'Laptops & Computers', 'Smartphones & Tablets', 'Audio & Sound', 'Wearable Tech',
        'Home Automation', 'Monitors & Displays', 'Cameras & Optics', 'Gaming Peripherals',
        'Storage & Networking', 'Office Supplies', 'Power & Batteries', 'Smart Lighting'
      ],
      'projects.name': [
        'Project Apollo', 'Phoenix Migration', 'Hyperion Data Lake', 'Nexus Auth Portal',
        'Vanguard Mobile 2.0', 'Titan Core Engine', 'Quantum Analytics Platform', 'Starlight CDN',
        'Aero Flight Dashboard', 'Horizon Microservices', 'Zenith Customer 360', 'Apex Payment Gateway'
      ],
      'tasks.title': [
        'Implement OAuth2 PKCE flow', 'Optimize PostgreSQL index on orders', 'Migrate Redis cluster to AWS',
        'Design responsive checkout modal', 'Fix memory leak in websocket worker', 'Implement Stripe webhook handler',
        'Update OpenAPI 3.1 specification', 'Audit role-based access control', 'Configure Prometheus alerting',
        'Conduct load testing for flash sale', 'Refactor billing subscription engine', 'Add multi-region failover'
      ],
      'departments.name': [
        'Engineering', 'Product Management', 'Design & UX', 'Customer Success',
        'Finance & Operations', 'People & HR', 'Enterprise Sales', 'Legal & Compliance',
        'Information Security', 'Quality Assurance & SDET', 'DevOps & SRE', 'Marketing'
      ]
    };

    for (const t of tables) {
      tableDescriptions[t.name] = `Entities and metadata for ${t.name.replace(/_/g, ' ')}`;
    }

    return { tableDescriptions, domainVocabularies };
  }
}
