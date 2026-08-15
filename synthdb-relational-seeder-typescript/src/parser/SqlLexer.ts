/**
 * SynthDB - SQL Lexer & Tokenizer
 * Robust character state-machine tokenizer supporting:
 * - Multi-line comments (/* ... *\/) & single-line (-- and #)
 * - Escaped string literals ('string', "string", `identifier`)
 * - Schema-qualified identifiers (public.users, `db`.`users`)
 * - Nested parentheses tracking for types & defaults (DECIMAL(10,2), DEFAULT (datetime('now')))
 */

import { Token, TokenType } from '../types';

export class SqlLexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  private static readonly KEYWORDS = new Set([
    'CREATE', 'TABLE', 'ALTER', 'ADD', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'UNIQUE', 'CHECK', 'DEFAULT', 'NOT', 'NULL', 'AUTO_INCREMENT', 'AUTOINCREMENT', 'SERIAL',
    'BIGSERIAL', 'SMALLSERIAL', 'GENERATED', 'ALWAYS', 'AS', 'STORED', 'VIRTUAL', 'CASCADE',
    'SET', 'RESTRICT', 'NO', 'ACTION', 'IF', 'EXISTS', 'ON', 'DELETE', 'UPDATE', 'ENUM',
    'DEFERRABLE', 'INITIALLY', 'DEFERRED', 'IMMEDIATE', 'INDEX', 'UNIQUE'
  ]);

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.input.length) break;

      const char = this.input[this.pos];
      const startLine = this.line;
      const startCol = this.column;

      // String literals
      if (char === "'" || char === '"') {
        const strVal = this.readString(char);
        tokens.push({
          type: 'STRING_LITERAL',
          value: strVal,
          line: startLine,
          column: startCol
        });
        continue;
      }

      // Quoted / Backtick identifiers
      if (char === '`' || char === '[') {
        const closingChar = char === '`' ? '`' : ']';
        const idVal = this.readQuotedIdentifier(closingChar);
        tokens.push({
          type: 'IDENTIFIER',
          value: idVal,
          line: startLine,
          column: startCol
        });
        continue;
      }

      // Symbols and punctuation
      if (['(', ')', ',', ';', '.', '[', ']'].includes(char)) {
        this.advance();
        tokens.push({
          type: 'SYMBOL',
          value: char,
          line: startLine,
          column: startCol
        });
        continue;
      }

      // Operators
      if (['=', '<', '>', '!', '+', '-', '*', '/', '%'].includes(char)) {
        const op = this.readOperator();
        tokens.push({
          type: 'OPERATOR',
          value: op,
          line: startLine,
          column: startCol
        });
        continue;
      }

      // Numbers
      if (this.isDigit(char)) {
        const numVal = this.readNumber();
        tokens.push({
          type: 'NUMERIC_LITERAL',
          value: numVal,
          line: startLine,
          column: startCol
        });
        continue;
      }

      // Identifiers or Keywords
      if (this.isAlphaOrUnderscore(char)) {
        const word = this.readWord();
        const upper = word.toUpperCase();
        if (SqlLexer.KEYWORDS.has(upper)) {
          tokens.push({
            type: 'KEYWORD',
            value: upper,
            line: startLine,
            column: startCol
          });
        } else {
          tokens.push({
            type: 'IDENTIFIER',
            value: word,
            line: startLine,
            column: startCol
          });
        }
        continue;
      }

      // Unknown character, advance
      this.advance();
    }

    tokens.push({
      type: 'EOF',
      value: '',
      line: this.line,
      column: this.column
    });

    return tokens;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      const nextChar = this.pos + 1 < this.input.length ? this.input[this.pos + 1] : '';

      // Whitespace
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
        continue;
      }

      // Single line comments --
      if (char === '-' && nextChar === '-') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.advance();
        }
        continue;
      }

      // Single line comments #
      if (char === '#') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.advance();
        }
        continue;
      }

      // Multi line comments /* ... */
      if (char === '/' && nextChar === '*') {
        this.advance(); // /
        this.advance(); // *
        while (this.pos < this.input.length) {
          if (this.input[this.pos] === '*' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '/') {
            this.advance(); // *
            this.advance(); // /
            break;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  private readString(quoteChar: string): string {
    this.advance(); // skip opening quote
    let str = '';
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (char === '\\') {
        this.advance();
        if (this.pos < this.input.length) {
          str += this.input[this.pos];
          this.advance();
        }
        continue;
      }
      if (char === quoteChar) {
        // Check for escaped quote ''
        if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === quoteChar) {
          str += quoteChar;
          this.advance();
          this.advance();
          continue;
        }
        this.advance(); // skip closing quote
        break;
      }
      str += char;
      this.advance();
    }
    return str;
  }

  private readQuotedIdentifier(closingChar: string): string {
    this.advance(); // skip opening char
    let id = '';
    while (this.pos < this.input.length && this.input[this.pos] !== closingChar) {
      id += this.input[this.pos];
      this.advance();
    }
    if (this.pos < this.input.length) {
      this.advance(); // skip closing char
    }
    return id;
  }

  private readWord(): string {
    let word = '';
    while (this.pos < this.input.length && this.isIdentChar(this.input[this.pos])) {
      word += this.input[this.pos];
      this.advance();
    }
    return word;
  }

  private readNumber(): string {
    let num = '';
    while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
      num += this.input[this.pos];
      this.advance();
    }
    return num;
  }

  private readOperator(): string {
    let op = this.input[this.pos];
    this.advance();
    if (this.pos < this.input.length) {
      const next = this.input[this.pos];
      if (['=', '>'].includes(next) && ['<', '>', '!', '='].includes(op)) {
        op += next;
        this.advance();
      }
    }
    return op;
  }

  private advance(): void {
    if (this.input[this.pos] === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.pos++;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlphaOrUnderscore(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '$';
  }

  private isIdentChar(char: string): boolean {
    return this.isAlphaOrUnderscore(char) || this.isDigit(char);
  }
}
