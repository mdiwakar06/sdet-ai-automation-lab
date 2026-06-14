#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';
import { program } from './cli';

// Load environmental variables (.env) from the workspace
dotenv.config();

async function main() {
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});
