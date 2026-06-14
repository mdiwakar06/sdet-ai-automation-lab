import * as fs from 'fs';
import * as path from 'path';
import { PersonaConfig } from '../types';
import { logger } from '../utils/logger';

// Find project root path
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DEFAULT_PERSONAS_DIR = path.join(PROJECT_ROOT, 'templates', 'default-personas');

export function loadPersona(filePath: string): PersonaConfig {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    logger.debug(`Loading persona from: ${absolutePath}`);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File does not exist: ${absolutePath}`);
    }

    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    const config = JSON.parse(fileContent) as PersonaConfig;

    // Validation
    if (!config.id || !config.name || !config.systemPrompt || !config.targetGoal) {
      throw new Error('Invalid persona config: id, name, targetGoal, and systemPrompt are required fields.');
    }

    return config;
  } catch (error) {
    logger.error(`Failed to load persona config at ${filePath}`, error);
    throw error;
  }
}

export function getDefaultPersonas(): PersonaConfig[] {
  try {
    if (!fs.existsSync(DEFAULT_PERSONAS_DIR)) {
      logger.warn(`Default personas directory does not exist at: ${DEFAULT_PERSONAS_DIR}`);
      return [];
    }

    const files = fs.readdirSync(DEFAULT_PERSONAS_DIR);
    const personas: PersonaConfig[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(DEFAULT_PERSONAS_DIR, file);
          personas.push(loadPersona(filePath));
        } catch (e) {
          logger.warn(`Failed to parse default persona: ${file}`);
        }
      }
    }

    return personas;
  } catch (error) {
    logger.error('Failed to load default personas', error);
    return [];
  }
}

export function getPersonaById(id: string): PersonaConfig | undefined {
  const defaults = getDefaultPersonas();
  const found = defaults.find((p) => p.id === id);
  if (found) return found;

  // Try parsing path directly in case ID was passed as a path
  try {
    return loadPersona(id);
  } catch (e) {
    return undefined;
  }
}
