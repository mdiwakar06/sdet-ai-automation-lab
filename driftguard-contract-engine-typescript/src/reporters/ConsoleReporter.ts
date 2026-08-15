/**
 * Console Reporter for DriftGuard
 */

import pc from 'picocolors';
import { DriftReport, DiffItem, SeverityLevel } from '../types/diff';
import { logger } from '../utils/logger';

export class ConsoleReporter {
  /**
   * Renders the DriftReport to standard console output
   */
  static print(report: DriftReport): void {
    logger.banner('DRIFTGUARD CONTRACT ENGINE REPORT');

    console.log(pc.bold(pc.white(`Report ID:   `)) + pc.gray(report.id));
    console.log(pc.bold(pc.white(`Generated:   `)) + pc.gray(report.generatedAt));
    console.log(pc.bold(pc.white(`Endpoints:   `)) + pc.cyan(`${report.summary.totalEndpointsEvaluated} total evaluated (${report.summary.totalEndpointsBaseline} baseline, ${report.summary.totalEndpointsObserved} observed)`));
    console.log(pc.bold(pc.white(`Integrity:   `)) + this.formatScore(report.summary.score));

    // Summary Matrix
    console.log('\n' + pc.bold('DRIFT METRICS SUMMARY'));
    console.log(pc.gray('─'.repeat(64)));

    const criticalBadge = logger.badge('CRITICAL BREAKING', report.summary.criticalBreakingCount, 'red');
    const warningBadge = logger.badge('WARNING RISK', report.summary.warningRiskCount, 'yellow');
    const nonBreakingBadge = logger.badge('NON-BREAKING', report.summary.nonBreakingAdditionCount, 'green');

    console.log(`  ${criticalBadge}    ${warningBadge}    ${nonBreakingBadge}\n`);

    if (report.diffs.length === 0) {
      logger.success('No contract drift detected. Baseline and runtime specs are in 100% parity!\n');
      return;
    }

    // Diffs Table
    console.log(pc.bold('DETECTED CONTRACT DRIFTS'));
    console.log(pc.gray('─'.repeat(64)));

    report.diffs.forEach((diff, idx) => {
      this.printDiffItem(diff, idx + 1);
    });

    // Final Status
    console.log(pc.gray('─'.repeat(64)));
    if (report.summary.isContractBroken) {
      console.log(pc.bgRed(pc.white(pc.bold(' ✖ CONTRACT COMPATIBILITY FAILED '))) + pc.red(' Breaking changes detected in contract validation.'));
    } else {
      console.log(pc.bgGreen(pc.black(pc.bold(' ✔ CONTRACT COMPATIBLE '))) + pc.green(' No critical breaking changes detected.'));
    }
    console.log('');
  }

  private static printDiffItem(diff: DiffItem, index: number): void {
    const sevColor = this.getSeverityColor(diff.severity);
    const sevLabel = `[${diff.severity}]`;

    console.log(`\n${pc.bold(`#${index}`)} ${sevColor(pc.bold(sevLabel))} ${pc.magenta(`[${diff.ruleId}]`)} ${pc.white(pc.bold(diff.path))}`);
    console.log(`   ${pc.bold('Pointer:')}     ${pc.cyan(diff.pointer)}`);
    console.log(`   ${pc.bold('Description:')} ${pc.white(diff.description)}`);

    if (diff.expected !== undefined && diff.actual !== undefined) {
      console.log(`   ${pc.bold('Expected:')}    ${pc.green(JSON.stringify(diff.expected))}`);
      console.log(`   ${pc.bold('Actual:')}      ${pc.red(JSON.stringify(diff.actual))}`);
    }

    console.log(`   ${pc.bold('Impact:')}      ${pc.yellow(diff.impact)}`);
    if (diff.remediationAdvice) {
      console.log(`   ${pc.bold('Remediation:')} ${pc.blue(diff.remediationAdvice)}`);
    }
  }

  private static getSeverityColor(severity: SeverityLevel): (text: string) => string {
    switch (severity) {
      case 'CRITICAL_BREAKING':
        return pc.red;
      case 'WARNING_RISK':
        return pc.yellow;
      case 'NON_BREAKING_ADDITION':
        return pc.green;
    }
  }

  private static formatScore(score: number): string {
    if (score >= 90) return pc.green(pc.bold(`${score}% (HEALTHY)`));
    if (score >= 70) return pc.yellow(pc.bold(`${score}% (DEGRADED)`));
    return pc.red(pc.bold(`${score}% (CRITICAL)`));
  }
}
