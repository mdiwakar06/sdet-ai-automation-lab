/**
 * Console Reporter - Pretty terminal output
 */

import chalk from 'chalk';
import { AnalysisResult, TestAnalysis, TraceRCAReport } from '../types';
import { getStatusHistoryVisual } from '../analyzer';

/**
 * Print analysis results to console
 */
export function printConsoleReport(result: AnalysisResult): void {
  const { summary, tests } = result;
  
  console.log('\n' + chalk.bold.blue('═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.blue('                    FLAKY TEST ANALYSIS'));
  console.log(chalk.bold.blue('═══════════════════════════════════════════════════════════\n'));
  
  // Summary stats
  console.log(chalk.bold('Summary:'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`  Total Tests:          ${chalk.white(summary.totalTests)}`);
  console.log(`  Test Runs Analyzed:   ${chalk.white(summary.totalRuns)}`);
  console.log(`  Flaky Tests:          ${summary.flakyTests > 0 ? chalk.red.bold(summary.flakyTests) : chalk.green(summary.flakyTests)}`);
  console.log(`  Stable Passing:       ${chalk.green(summary.stablePassingTests)}`);
  console.log(`  Stable Failing:       ${summary.stableFailingTests > 0 ? chalk.yellow(summary.stableFailingTests) : chalk.gray(summary.stableFailingTests)}`);
  console.log(`  Avg Flakiness Score:  ${getScoreColor(summary.avgFlakinessScore)}`);
  console.log();
  
  // Top flaky tests
  if (summary.topFlaky.length > 0) {
    console.log(chalk.bold.red('⚠ Flaky Tests Detected:'));
    console.log(chalk.gray('─'.repeat(60)));
    
    for (const test of summary.topFlaky) {
      printTestSummary(test);
    }
  } else {
    console.log(chalk.green.bold('✓ No flaky tests detected!'));
  }
  
  // Legend
  console.log();
  console.log(chalk.gray('Legend: ✓ = passed, ✗ = failed, ! = error, ○ = skipped'));
  console.log(chalk.gray(`Analyzed at: ${summary.analyzedAt.toISOString()}`));
  console.log();
}

/**
 * Print a single test summary
 */
function printTestSummary(test: TestAnalysis): void {
  const scoreStr = getScoreColor(test.flakinessScore);
  const history = getStatusHistoryVisual(test.statusHistory);
  
  console.log();
  console.log(`  ${chalk.bold(test.testName)}`);
  if (test.className && test.className !== test.testName) {
    console.log(`  ${chalk.gray(test.className)}`);
  }
  console.log(`  Flakiness: ${scoreStr}  |  Runs: ${test.totalRuns}  |  Pass: ${chalk.green(test.passCount)}  Fail: ${chalk.red(test.failCount + test.errorCount)}`);
  console.log(`  History: ${colorizeHistory(history)}`);
  if (test.lastError) {
    const truncatedError = test.lastError.length > 80 
      ? test.lastError.substring(0, 77) + '...' 
      : test.lastError;
    console.log(`  ${chalk.red('Last Error:')} ${chalk.gray(truncatedError)}`);
  }
}

/**
 * Colorize status history
 */
function colorizeHistory(history: string): string {
  return history
    .replace(/✓/g, chalk.green('✓'))
    .replace(/✗/g, chalk.red('✗'))
    .replace(/!/g, chalk.yellow('!'))
    .replace(/○/g, chalk.gray('○'));
}

/**
 * Get colored score based on value
 */
function getScoreColor(score: number): string {
  if (score === 0) return chalk.green(`${score}%`);
  if (score < 20) return chalk.yellow(`${score}%`);
  if (score < 50) return chalk.hex('#FFA500')(`${score}%`); // Orange
  return chalk.red.bold(`${score}%`);
}

/**
 * Helper to truncate text to fit in console boxes
 */
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

/**
 * Helper to wrap text into array of lines for printing inside a box
 */
function wrapText(text: string, maxLen: number): string[] {
  const lines: string[] = [];
  const rawLines = text.split('\n');
  for (const rawLine of rawLines) {
    let currentLine = rawLine;
    while (currentLine.length > maxLen) {
      let spaceIdx = currentLine.lastIndexOf(' ', maxLen);
      if (spaceIdx === -1 || spaceIdx < maxLen / 2) {
        spaceIdx = maxLen;
      }
      lines.push(currentLine.substring(0, spaceIdx));
      currentLine = currentLine.substring(spaceIdx).trim();
    }
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Print a structured, beautiful TraceRCA diagnostic & AI result card to terminal
 */
export function printTraceRCAReport(report: TraceRCAReport): void {
  const { testName, filePath, aiAnalysis, error } = report;
  
  console.log('\n' + chalk.bold.cyan('┌──────────────────────────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan('│                          TraceRCA Failure Analysis                           │'));
  console.log(chalk.bold.cyan('├──────────────────────────────────────────────────────────────────────────────┤'));
  
  console.log(`│ ${chalk.bold('Test:')} ${truncateText(testName, 70).padEnd(70)} │`);
  if (filePath) {
    console.log(`│ ${chalk.bold('File:')} ${truncateText(filePath, 70).padEnd(70)} │`);
  }
  
  if (error) {
    console.log(chalk.bold.cyan('├──────────────────────────────────────────────────────────────────────────────┤'));
    console.log(`│ ${chalk.red.bold('Error during analysis:')}                                                     │`);
    const wrappedError = wrapText(error, 76);
    for (const line of wrappedError) {
      console.log(`│ ${chalk.red(line).padEnd(76)} │`);
    }
  } else if (aiAnalysis) {
    const { classification, confidence, summary, detailedAnalysis, recommendedFix } = aiAnalysis;
    
    // Color code based on classification
    let classColor = chalk.white;
    if (classification === 'App Bug') classColor = chalk.red.bold;
    if (classification === 'Test Bug') classColor = chalk.yellow.bold;
    if (classification === 'Infra Flake') classColor = chalk.magenta.bold;
    
    // Color code based on confidence
    let confColor = chalk.white;
    if (confidence === 'High') confColor = chalk.green.bold;
    if (confidence === 'Medium') confColor = chalk.yellow.bold;
    if (confidence === 'Low') confColor = chalk.red.bold;
    
    console.log(chalk.bold.cyan('├──────────────────────────────────────────────────────────────────────────────┤'));
    console.log(`│ ${chalk.bold('Category:')} ${classColor(classification).padEnd(20)} | ${chalk.bold('Confidence:')} ${confColor(confidence).padEnd(20)}          │`);
    console.log(chalk.bold.cyan('├──────────────────────────────────────────────────────────────────────────────┤'));
    
    console.log(`│ ${chalk.bold('Summary:')}                                                                     │`);
    const wrappedSummary = wrapText(summary, 76);
    for (const line of wrappedSummary) {
      console.log(`│ ${line.padEnd(76)} │`);
    }
    
    console.log(chalk.bold.cyan('├──────────────────────────────────────────────────────────────────────────────┤'));
    console.log(`│ ${chalk.bold('Detailed Analysis:')}                                                           │`);
    const wrappedAnalysis = wrapText(detailedAnalysis, 76);
    for (const line of wrappedAnalysis) {
      console.log(`│ ${line.padEnd(76)} │`);
    }
    
    console.log(chalk.bold.cyan('├──────────────────────────────────────────────────────────────────────────────┤'));
    console.log(`│ ${chalk.bold('Recommended Fix:')}                                                             │`);
    const wrappedFix = wrapText(recommendedFix, 76);
    for (const line of wrappedFix) {
      console.log(`│ ${line.padEnd(76)} │`);
    }
  } else {
    console.log(chalk.bold.cyan('├──────────────────────────────────────────────────────────────────────────────┤'));
    console.log(`│ ${chalk.yellow('No AI analysis generated (Gemini API Key missing or analysis limit reached)')} │`);
  }
  
  console.log(chalk.bold.cyan('└──────────────────────────────────────────────────────────────────────────────┘\n'));
}
