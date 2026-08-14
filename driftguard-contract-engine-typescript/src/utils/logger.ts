/**
 * Colored Logger Utility for DriftGuard
 */

import pc from 'picocolors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

class Logger {
  private currentLevel: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
    const currentIdx = levels.indexOf(this.currentLevel);
    const targetIdx = levels.indexOf(level);
    return targetIdx >= currentIdx && this.currentLevel !== 'silent';
  }

  banner(text: string): void {
    if (this.currentLevel === 'silent') return;
    const line = '═'.repeat(64);
    console.log(pc.cyan(`\n╔${line}╗`));
    console.log(pc.cyan(`║  ${pc.bold(pc.white(text.padEnd(60)))}  ║`));
    console.log(pc.cyan(`╚${line}╝\n`));
  }

  section(title: string): void {
    if (this.currentLevel === 'silent') return;
    console.log(`\n${pc.bold(pc.blue('▶'))} ${pc.bold(pc.white(title))}`);
    console.log(pc.gray('─'.repeat(50)));
  }

  info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;
    console.log(`${pc.cyan('ℹ')} ${pc.white(message)}`, ...args);
  }

  success(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;
    console.log(`${pc.green('✔')} ${pc.green(message)}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return;
    console.log(`${pc.yellow('⚠')} ${pc.yellow(message)}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    if (!this.shouldLog('error')) return;
    console.log(`${pc.red('✖')} ${pc.red(pc.bold(message))}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug')) return;
    console.log(`${pc.magenta('🔍')} ${pc.gray(message)}`, ...args);
  }

  critical(message: string, ...args: any[]): void {
    if (this.currentLevel === 'silent') return;
    console.log(`${pc.bgRed(pc.white(pc.bold(' CRITICAL BREAKING ')))} ${pc.red(message)}`, ...args);
  }

  badge(label: string, value: string | number, color: 'red' | 'yellow' | 'green' | 'blue' = 'blue'): string {
    const colorFn = {
      red: pc.bgRed,
      yellow: pc.bgYellow,
      green: pc.bgGreen,
      blue: pc.bgBlue,
    }[color];
    return `${colorFn(pc.white(pc.bold(` ${label} `)))} ${pc.bold(String(value))}`;
  }
}

export const logger = new Logger();
