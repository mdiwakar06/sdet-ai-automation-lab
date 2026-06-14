import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { loadPersona, getDefaultPersonas, getPersonaById } from '../config/personas';
import { PlayOrchestrator } from '../core/PlayOrchestrator';
import { logger } from '../utils/logger';
import { SuiteResult, PlayResult } from '../types';

const program = new Command();

program
  .name('personaplay')
  .description('PersonaPlay: Conversational AI Evaluator & Red-Teaming Engine')
  .version('1.0.0');

// 1. Run command: evaluate a single persona against a target
program
  .command('run')
  .description('Run a single evaluation play using a specific persona')
  .requiredOption('-t, --target <url>', 'The target chatbot application URL')
  .requiredOption('-p, --persona <pathOrId>', 'Path to a persona JSON config file or a default persona ID (jailbreaker, refund_seeker, support_seeker)')
  .option('-o, --output-dir <path>', 'Directory to save output reports', 'reports')
  .action(async (options) => {
    try {
      logger.info('--- Starting Single Evaluation Play ---');
      let personaConfig = getPersonaById(options.persona);
      
      if (!personaConfig) {
        // Try to load as a direct path
        try {
          personaConfig = loadPersona(options.persona);
        } catch (err) {
          logger.error(`Could not load persona. Ensure "${options.persona}" is a valid default ID or a path to a JSON file.`);
          process.exit(1);
        }
      }

      const orchestrator = new PlayOrchestrator(
        personaConfig,
        options.target,
        path.resolve(options.outputDir)
      );

      const result = await orchestrator.run();

      console.log('\n==================================================');
      console.log('                 PLAY RESULTS                     ');
      console.log('==================================================');
      console.log(`Persona:         ${result.personaName} (${result.personaId})`);
      console.log(`Target URL:      ${result.targetUrl}`);
      console.log(`Status:          ${result.status}`);
      console.log(`Turns:           ${result.turns} / ${result.maxTurns}`);
      console.log(`Duration:        ${(result.durationMs / 1000).toFixed(1)}s`);
      
      if (result.evaluation) {
        console.log('--------------------------------------------------');
        console.log('              JUDGE COMPLIANCE AUDIT             ');
        console.log('--------------------------------------------------');
        console.log(`Goal Achieved:   ${result.evaluation.goalAchieved ? 'YES 🎯' : 'NO ❌'}`);
        console.log(`Jailbroken:      ${result.evaluation.jailbroken ? 'YES 🚨' : 'NO ✅'}`);
        console.log(`Prompt Leaked:   ${result.evaluation.promptLeaked ? 'YES 🚨' : 'NO ✅'}`);
        console.log(`Safety Violation:${result.evaluation.safetyViolation ? `YES (${result.evaluation.safetyViolationCategory}) 🚨` : 'NO ✅'}`);
        console.log(`Alignment Score: ${(result.evaluation.alignmentScore * 100).toFixed(0)}%`);
        console.log(`Refusal Rate:    ${(result.evaluation.refusalRate * 100).toFixed(0)}%`);
        console.log(`Justification:   ${result.evaluation.evaluationJustification}`);
      }
      console.log('==================================================\n');

      if (result.status === 'ERROR') {
        process.exit(1);
      }
    } catch (err: any) {
      logger.error('CLI run command failed', err);
      process.exit(1);
    }
  });

// 2. Suite command: evaluate a suite of personas (either defaults or from a folder)
program
  .command('suite')
  .description('Run a parallel/sequential evaluation suite of personas')
  .requiredOption('-t, --target <url>', 'The target chatbot application URL')
  .option('-d, --personas-dir <path>', 'Directory containing custom persona JSON config files (runs defaults if omitted)')
  .option('-o, --output-dir <path>', 'Directory to save output reports', 'reports')
  .action(async (options) => {
    try {
      logger.info('--- Starting Evaluation Suite ---');
      let personas = [];

      if (options.personasDir) {
        const dirPath = path.resolve(options.personasDir);
        logger.info(`Loading custom personas from: ${dirPath}`);
        if (!fs.existsSync(dirPath)) {
          logger.error(`Personas directory does not exist: ${dirPath}`);
          process.exit(1);
        }
        
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              personas.push(loadPersona(path.join(dirPath, file)));
            } catch (err) {
              logger.warn(`Skipping invalid persona config: ${file}`);
            }
          }
        }
      } else {
        logger.info('Using default test personas...');
        personas = getDefaultPersonas();
      }

      if (personas.length === 0) {
        logger.error('No personas found to execute.');
        process.exit(1);
      }

      logger.info(`Found ${personas.length} personas to evaluate. Executing suite...`);
      const results: PlayResult[] = [];

      // Run personas sequentially to keep console logging readable and avoid rate limiting
      for (const persona of personas) {
        logger.info(`\nRunning suite play for persona: ${persona.name}...`);
        const orchestrator = new PlayOrchestrator(
          persona,
          options.target,
          path.resolve(options.outputDir)
        );
        const result = await orchestrator.run();
        results.push(result);
      }

      // Compile suite summary
      const suiteResult: SuiteResult = {
        targetUrl: options.target,
        timestamp: new Date().toISOString(),
        totalPlays: results.length,
        successfulPlays: results.filter((r) => r.status === 'SUCCESS').length,
        stalledPlays: results.filter((r) => r.status === 'CONVERSATIONAL_STALL').length,
        failedPlays: results.filter((r) => r.status === 'ERROR').length,
        results
      };

      // Save suite summary report
      const outputFolder = path.resolve(options.outputDir);
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }
      const suitePath = path.join(outputFolder, `suite-summary-${Date.now()}.json`);
      fs.writeFileSync(suitePath, JSON.stringify(suiteResult, null, 2), 'utf8');

      // Print terminal summary
      console.log('\n==========================================================================================');
      console.log('                                 SUITE EVALUATION SUMMARY                                 ');
      console.log('==========================================================================================');
      console.log(`Target URL:      ${suiteResult.targetUrl}`);
      console.log(`Total Plays:     ${suiteResult.totalPlays}`);
      console.log(`Successful:      ${suiteResult.successfulPlays}`);
      console.log(`Stalled:         ${suiteResult.stalledPlays}`);
      console.log(`Failed/Error:    ${suiteResult.failedPlays}`);
      console.log('------------------------------------------------------------------------------------------');
      console.log('ID\t\tName\t\t\tStatus\t\tGoal?\tJailbroken?\tAlignment');
      console.log('------------------------------------------------------------------------------------------');
      
      for (const res of suiteResult.results) {
        const goal = res.evaluation ? (res.evaluation.goalAchieved ? 'YES 🎯' : 'NO ❌') : 'N/A';
        const jailbroken = res.evaluation ? (res.evaluation.jailbroken ? 'YES 🚨' : 'NO ✅') : 'N/A';
        const align = res.evaluation ? `${(res.evaluation.alignmentScore * 100).toFixed(0)}%` : 'N/A';
        
        // Truncate fields for neat alignment
        const truncatedId = res.personaId.substring(0, 12).padEnd(12);
        const truncatedName = res.personaName.substring(0, 20).padEnd(20);
        const paddedStatus = res.status.padEnd(12);

        console.log(`${truncatedId}\t${truncatedName}\t${paddedStatus}\t${goal}\t${jailbroken}\t\t${align}`);
      }
      console.log('==========================================================================================');
      logger.info(`Suite execution finished. Summary report written to: ${suitePath}\n`);

    } catch (err: any) {
      logger.error('CLI suite command failed', err);
      process.exit(1);
    }
  });

export { program };
