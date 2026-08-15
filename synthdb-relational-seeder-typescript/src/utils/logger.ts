/**
 * SynthDB - ANSI Colored Formatted Logger
 */

let pc: any;
try {
  pc = require('picocolors');
} catch {
  // Safe fallback if picocolors is not available
  const identity = (s: any) => String(s);
  pc = {
    cyan: identity,
    blue: identity,
    green: identity,
    yellow: identity,
    red: identity,
    gray: identity,
    magenta: identity,
    bold: identity,
    dim: identity,
  };
}

export class Logger {
  private static isVerbose = false;

  public static setVerbose(verbose: boolean): void {
    this.isVerbose = verbose;
  }

  public static banner(title: string, subtitle?: string): void {
    console.log('\n' + pc.bold(pc.cyan('='.repeat(64))));
    console.log(pc.bold(pc.cyan(`  ⚡ SynthDB: ${title}`)));
    if (subtitle) {
      console.log(pc.dim(pc.gray(`     ${subtitle}`)));
    }
    console.log(pc.bold(pc.cyan('='.repeat(64))) + '\n');
  }

  public static info(message: string, ...args: any[]): void {
    console.log(pc.blue('ℹ') + ' ' + pc.bold(message), ...args);
  }

  public static step(stepNumber: number, totalSteps: number, title: string): void {
    console.log(
      `\n${pc.magenta(`[${stepNumber}/${totalSteps}]`)} ${pc.bold(pc.cyan(title))}`
    );
  }

  public static success(message: string, ...args: any[]): void {
    console.log(pc.green('✔') + ' ' + pc.green(message), ...args);
  }

  public static warn(message: string, ...args: any[]): void {
    console.log(pc.yellow('⚠') + ' ' + pc.yellow(message), ...args);
  }

  public static error(message: string, ...args: any[]): void {
    console.error(pc.red('✖') + ' ' + pc.red(message), ...args);
  }

  public static debug(message: string, ...args: any[]): void {
    if (this.isVerbose) {
      console.log(pc.dim(pc.gray(`  🔍 [DEBUG] ${message}`)), ...args);
    }
  }

  public static tableSummary(headers: string[], rows: (string | number)[][]): void {
    const colWidths = headers.map((h, i) => {
      const maxRowLen = rows.reduce(
        (max, r) => Math.max(max, String(r[i] ?? '').length),
        0
      );
      return Math.max(h.length, maxRowLen) + 2;
    });

    const border = '+' + colWidths.map((w) => '-'.repeat(w)).join('+') + '+';
    console.log(pc.gray(border));

    const headerRow =
      '|' +
      headers
        .map((h, i) => pc.bold(pc.cyan(` ${h.padEnd(colWidths[i] - 1)}`)))
        .join('|') +
      '|';
    console.log(headerRow);
    console.log(pc.gray(border));

    for (const row of rows) {
      const rowStr =
        '|' +
        row
          .map((cell, i) => {
            const str = String(cell ?? '');
            return ` ${str.padEnd(colWidths[i] - 1)}`;
          })
          .join('|') +
        '|';
      console.log(rowStr);
    }
    console.log(pc.gray(border));
  }
}
