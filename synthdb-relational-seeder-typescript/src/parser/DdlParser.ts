/**
 * SynthDB - DDL Abstract Syntax Tree Parser
 * Robust SQL DDL parser extracting tables, columns, constraints, composite PKs, FKs, and Check constraints.
 */

import { SqlLexer } from './SqlLexer';
import { DialectNormalizer } from './DialectNormalizer';
import { SchemaIR, TableDefinition, ColumnDefinition, Token, Dialect, CompositeForeignKey, CompositeUniqueConstraint } from '../types';

export class DdlParser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private currentDialect: Dialect = 'generic';

  public parse(ddl: string, forcedDialect?: Dialect): SchemaIR {
    this.currentDialect = forcedDialect || DialectNormalizer.detectDialect(ddl);
    const lexer = new SqlLexer(ddl);
    this.tokens = lexer.tokenize();
    this.pos = 0;

    const tablesMap = new Map<string, TableDefinition>();

    while (!this.isEof()) {
      if (this.matchKeyword('CREATE') && this.peekKeyword('TABLE')) {
        this.advance(); // consume CREATE
        const table = this.parseCreateTable();
        if (table) {
          tablesMap.set(table.name.toLowerCase(), table);
        }
      } else if (this.matchKeyword('ALTER') && this.peekKeyword('TABLE')) {
        this.advance(); // consume ALTER
        this.parseAlterTable(tablesMap);
      } else {
        this.advance();
      }
    }

    return {
      dialect: this.currentDialect,
      tables: Array.from(tablesMap.values()),
      rawDdl: ddl
    };
  }

  private parseCreateTable(): TableDefinition | null {
    this.expectKeyword('TABLE');

    // Optional IF NOT EXISTS
    if (this.matchKeyword('IF')) {
      this.advance(); // IF
      this.expectKeyword('NOT');
      this.expectKeyword('EXISTS');
    }

    // Table Name (may be schema.table or `db`.`table`)
    const rawTableName = this.parseQualifiedIdentifier();
    const tableName = this.cleanIdentifier(rawTableName);

    // Expect '('
    this.expectSymbol('(');

    const columns: ColumnDefinition[] = [];
    const primaryKeyCols: string[] = [];
    const foreignKeys: Array<{ column: string; targetTable: string; targetColumn: string; isSelfReferential?: boolean; constraintName?: string }> = [];
    const compositeForeignKeys: CompositeForeignKey[] = [];
    const uniqueConstraints: CompositeUniqueConstraint[] = [];
    const checkConstraints: string[] = [];

    while (!this.isEof() && !this.checkSymbol(')')) {
      // Check for table-level constraints
      if (this.matchKeyword('CONSTRAINT')) {
        this.advance(); // CONSTRAINT
        const constraintName = this.advance().value;
        this.parseTableLevelConstraint(
          tableName,
          constraintName,
          primaryKeyCols,
          foreignKeys,
          compositeForeignKeys,
          uniqueConstraints,
          checkConstraints
        );
      } else if (this.matchKeyword('PRIMARY') && this.peekKeyword('KEY')) {
        this.advance(); // PRIMARY
        this.advance(); // KEY
        const pks = this.parseIdentifierListInParens();
        primaryKeyCols.push(...pks);
      } else if (this.matchKeyword('FOREIGN') && this.peekKeyword('KEY')) {
        this.advance(); // FOREIGN
        this.advance(); // KEY
        this.parseTableLevelForeignKey(tableName, undefined, foreignKeys, compositeForeignKeys);
      } else if (this.matchKeyword('UNIQUE')) {
        this.advance(); // UNIQUE
        // Optional KEY / INDEX keyword
        if (this.matchKeyword('KEY') || this.matchKeyword('INDEX')) {
          this.advance();
        }
        // Optional index name
        if (this.checkIdentifier() && !this.checkSymbol('(')) {
          this.advance();
        }
        const uqCols = this.parseIdentifierListInParens();
        uniqueConstraints.push({ columns: uqCols });
      } else if (this.matchKeyword('CHECK')) {
        this.advance(); // CHECK
        const checkExpr = this.parseExpressionInParens();
        checkConstraints.push(checkExpr);
      } else {
        // Must be a column definition
        const col = this.parseColumnDefinition(tableName);
        if (col) {
          columns.push(col);
          if (col.isPrimaryKey && !primaryKeyCols.includes(col.name)) {
            primaryKeyCols.push(col.name);
          }
          if (col.foreignKey) {
            foreignKeys.push({
              column: col.name,
              targetTable: col.foreignKey.targetTable,
              targetColumn: col.foreignKey.targetColumn,
              isSelfReferential: col.foreignKey.isSelfReferential,
              constraintName: col.foreignKey.constraintName
            });
          }
          if (col.isUnique) {
            uniqueConstraints.push({ columns: [col.name] });
          }
        }
      }

      // Check for comma or closing paren
      if (this.checkSymbol(',')) {
        this.advance();
      } else if (!this.checkSymbol(')')) {
        this.advance();
      }
    }

    if (this.checkSymbol(')')) {
      this.advance(); // consume ')'
    }

    // Consume trailing table options (e.g. ENGINE=InnoDB DEFAULT CHARSET=utf8mb4) until semicolon
    while (!this.isEof() && !this.checkSymbol(';')) {
      if (this.matchKeyword('CREATE') || this.matchKeyword('ALTER')) {
        break; // start of next statement without semicolon
      }
      this.advance();
    }
    if (this.checkSymbol(';')) {
      this.advance();
    }

    // Apply primary key flags to columns
    for (const col of columns) {
      if (primaryKeyCols.includes(col.name)) {
        col.isPrimaryKey = true;
        col.isNullable = false;
      }
    }

    return {
      name: tableName,
      columns,
      primaryKey: primaryKeyCols,
      foreignKeys,
      compositeForeignKeys,
      uniqueConstraints,
      checkConstraints
    };
  }

  private parseColumnDefinition(tableName: string): ColumnDefinition | null {
    if (!this.checkIdentifier() && !this.checkKeyword()) {
      return null;
    }

    const rawColName = this.advance().value;
    const colName = this.cleanIdentifier(rawColName);

    // Read full column type (including length/precision and parentheses)
    const rawType = this.parseTypeExpression();
    const typeInfo = DialectNormalizer.normalizeType(rawType);

    let isPrimaryKey = false;
    let isAutoIncrement = Boolean(typeInfo.isAutoIncrement);
    let isNullable = true;
    let isUnique = false;
    let defaultValue: any = undefined;
    let checkConstraint: string | undefined = undefined;
    let isGenerated = false;
    let generationExpression: string | undefined = undefined;
    let foreignKey: ColumnDefinition['foreignKey'] = undefined;

    // Parse column constraints / attributes
    while (!this.isEof() && !this.checkSymbol(',') && !this.checkSymbol(')')) {
      if (this.matchKeyword('PRIMARY') && this.peekKeyword('KEY')) {
        this.advance(); // PRIMARY
        this.advance(); // KEY
        isPrimaryKey = true;
        isNullable = false;
      } else if (this.matchKeyword('NOT') && this.peekKeyword('NULL')) {
        this.advance(); // NOT
        this.advance(); // NULL
        isNullable = false;
      } else if (this.matchKeyword('NULL')) {
        this.advance();
        isNullable = true;
      } else if (this.matchKeyword('AUTO_INCREMENT') || this.matchKeyword('AUTOINCREMENT')) {
        this.advance();
        isAutoIncrement = true;
      } else if (this.matchKeyword('UNIQUE')) {
        this.advance();
        isUnique = true;
      } else if (this.matchKeyword('DEFAULT')) {
        this.advance(); // DEFAULT
        defaultValue = this.parseDefaultValue();
      } else if (this.matchKeyword('CHECK')) {
        this.advance();
        checkConstraint = this.parseExpressionInParens();
      } else if (this.matchKeyword('GENERATED') || this.matchKeyword('AS')) {
        if (this.matchKeyword('GENERATED')) {
          this.advance(); // GENERATED
          if (this.matchKeyword('ALWAYS')) this.advance();
        }
        if (this.matchKeyword('AS')) this.advance();
        generationExpression = this.parseExpressionInParens();
        isGenerated = true;
        // Skip STORED or VIRTUAL
        if (this.matchKeyword('STORED') || this.matchKeyword('VIRTUAL')) {
          this.advance();
        }
      } else if (this.matchKeyword('REFERENCES')) {
        this.advance(); // REFERENCES
        const targetTable = this.cleanIdentifier(this.parseQualifiedIdentifier());
        const targetCols = this.parseIdentifierListInParens();
        const targetCol = targetCols[0] || 'id';

        let onDelete: string | undefined;
        let onUpdate: string | undefined;

        while (this.matchKeyword('ON')) {
          this.advance(); // ON
          if (this.matchKeyword('DELETE')) {
            this.advance();
            onDelete = this.parseReferenceAction();
          } else if (this.matchKeyword('UPDATE')) {
            this.advance();
            onUpdate = this.parseReferenceAction();
          }
        }

        foreignKey = {
          targetTable,
          targetColumn: targetCol,
          sourceColumn: colName,
          onDelete,
          onUpdate,
          isSelfReferential: targetTable.toLowerCase() === tableName.toLowerCase()
        };
      } else {
        this.advance();
      }
    }

    return {
      name: colName,
      rawType,
      normalizedType: typeInfo.normalizedType,
      length: typeInfo.length,
      precision: typeInfo.precision,
      scale: typeInfo.scale,
      isPrimaryKey,
      isAutoIncrement,
      isNullable,
      isUnique,
      defaultValue,
      enumValues: typeInfo.enumValues,
      checkConstraint,
      isGenerated,
      generationExpression,
      foreignKey
    };
  }

  private parseTableLevelConstraint(
    tableName: string,
    constraintName: string,
    primaryKeyCols: string[],
    foreignKeys: Array<{ column: string; targetTable: string; targetColumn: string; isSelfReferential?: boolean; constraintName?: string }>,
    compositeForeignKeys: CompositeForeignKey[],
    uniqueConstraints: CompositeUniqueConstraint[],
    checkConstraints: string[]
  ): void {
    if (this.matchKeyword('PRIMARY') && this.peekKeyword('KEY')) {
      this.advance(); // PRIMARY
      this.advance(); // KEY
      const pks = this.parseIdentifierListInParens();
      primaryKeyCols.push(...pks);
    } else if (this.matchKeyword('FOREIGN') && this.peekKeyword('KEY')) {
      this.advance(); // FOREIGN
      this.advance(); // KEY
      this.parseTableLevelForeignKey(tableName, constraintName, foreignKeys, compositeForeignKeys);
    } else if (this.matchKeyword('UNIQUE')) {
      this.advance(); // UNIQUE
      const uqCols = this.parseIdentifierListInParens();
      uniqueConstraints.push({ name: constraintName, columns: uqCols });
    } else if (this.matchKeyword('CHECK')) {
      this.advance(); // CHECK
      const checkExpr = this.parseExpressionInParens();
      checkConstraints.push(checkExpr);
    }
  }

  private parseTableLevelForeignKey(
    tableName: string,
    constraintName: string | undefined,
    foreignKeys: Array<{ column: string; targetTable: string; targetColumn: string; isSelfReferential?: boolean; constraintName?: string }>,
    compositeForeignKeys: CompositeForeignKey[]
  ): void {
    const sourceCols = this.parseIdentifierListInParens();
    this.expectKeyword('REFERENCES');
    const targetTable = this.cleanIdentifier(this.parseQualifiedIdentifier());
    const targetCols = this.parseIdentifierListInParens();

    if (sourceCols.length === 1 && targetCols.length === 1) {
      foreignKeys.push({
        column: sourceCols[0],
        targetTable,
        targetColumn: targetCols[0],
        isSelfReferential: targetTable.toLowerCase() === tableName.toLowerCase(),
        constraintName
      });
    } else if (sourceCols.length > 1) {
      compositeForeignKeys.push({
        targetTable,
        sourceColumns: sourceCols,
        targetColumns: targetCols,
        constraintName
      });
    }

    // Skip ON DELETE / ON UPDATE / DEFERRABLE
    while (!this.isEof() && !this.checkSymbol(',') && !this.checkSymbol(')')) {
      this.advance();
    }
  }

  private parseAlterTable(tablesMap: Map<string, TableDefinition>): void {
    this.expectKeyword('TABLE');
    const rawTableName = this.parseQualifiedIdentifier();
    const tableName = this.cleanIdentifier(rawTableName);
    const table = tablesMap.get(tableName.toLowerCase());

    if (this.matchKeyword('ADD')) {
      this.advance(); // ADD
      let constraintName: string | undefined;
      if (this.matchKeyword('CONSTRAINT')) {
        this.advance(); // CONSTRAINT
        constraintName = this.advance().value;
      }

      if (this.matchKeyword('FOREIGN') && this.peekKeyword('KEY')) {
        this.advance(); // FOREIGN
        this.advance(); // KEY
        const sourceCols = this.parseIdentifierListInParens();
        this.expectKeyword('REFERENCES');
        const targetTable = this.cleanIdentifier(this.parseQualifiedIdentifier());
        const targetCols = this.parseIdentifierListInParens();

        if (table) {
          if (sourceCols.length === 1 && targetCols.length === 1) {
            table.foreignKeys.push({
              column: sourceCols[0],
              targetTable,
              targetColumn: targetCols[0],
              isSelfReferential: targetTable.toLowerCase() === tableName.toLowerCase(),
              constraintName
            });

            // Update column FK property if present
            const col = table.columns.find(c => c.name.toLowerCase() === sourceCols[0].toLowerCase());
            if (col) {
              col.foreignKey = {
                targetTable,
                targetColumn: targetCols[0],
                sourceColumn: sourceCols[0],
                isSelfReferential: targetTable.toLowerCase() === tableName.toLowerCase(),
                constraintName
              };
            }
          } else if (sourceCols.length > 1) {
            if (!table.compositeForeignKeys) table.compositeForeignKeys = [];
            table.compositeForeignKeys.push({
              targetTable,
              sourceColumns: sourceCols,
              targetColumns: targetCols,
              constraintName
            });
          }
        }
      }
    }

    // Skip remaining tokens until semicolon
    while (!this.isEof() && !this.checkSymbol(';')) {
      this.advance();
    }
    if (this.checkSymbol(';')) {
      this.advance();
    }
  }

  private parseTypeExpression(): string {
    let typeStr = this.advance().value;
    // Check if type has parentheses (e.g. VARCHAR(255) or DECIMAL(10,2))
    if (this.checkSymbol('(')) {
      typeStr += this.parseExpressionInParensWithParens();
    }
    return typeStr;
  }

  private parseDefaultValue(): any {
    if (this.checkSymbol('(')) {
      return this.parseExpressionInParens();
    }
    const token = this.advance();
    if (token.type === 'STRING_LITERAL') return token.value;
    if (token.type === 'NUMERIC_LITERAL') return Number(token.value);
    if (token.value.toUpperCase() === 'NULL') return null;
    if (token.value.toUpperCase() === 'TRUE') return true;
    if (token.value.toUpperCase() === 'FALSE') return false;
    return token.value;
  }

  private parseReferenceAction(): string {
    const first = this.advance().value.toUpperCase();
    if (first === 'SET' && (this.matchKeyword('NULL') || this.matchKeyword('DEFAULT'))) {
      const second = this.advance().value.toUpperCase();
      return `${first} ${second}`;
    }
    if (first === 'NO' && this.matchKeyword('ACTION')) {
      const second = this.advance().value.toUpperCase();
      return `${first} ${second}`;
    }
    return first;
  }

  private parseQualifiedIdentifier(): string {
    let id = this.advance().value;
    if (this.checkSymbol('.')) {
      this.advance(); // consume '.'
      id = this.advance().value; // use base table name
    }
    return id;
  }

  private parseIdentifierListInParens(): string[] {
    this.expectSymbol('(');
    const list: string[] = [];
    while (!this.isEof() && !this.checkSymbol(')')) {
      const id = this.cleanIdentifier(this.advance().value);
      list.push(id);
      if (this.checkSymbol(',')) {
        this.advance();
      }
    }
    this.expectSymbol(')');
    return list;
  }

  private parseExpressionInParens(): string {
    this.expectSymbol('(');
    let depth = 1;
    let expr = '';
    while (!this.isEof() && depth > 0) {
      const token = this.advance();
      if (token.value === '(') {
        depth++;
        expr += token.value;
      } else if (token.value === ')') {
        depth--;
        if (depth > 0) expr += token.value;
      } else {
        expr += (expr.length > 0 && !expr.endsWith('(') ? ' ' : '') + token.value;
      }
    }
    return expr.trim();
  }

  private parseExpressionInParensWithParens(): string {
    return '(' + this.parseExpressionInParens() + ')';
  }

  private cleanIdentifier(id: string): string {
    return id.replace(/^[`"\[]|[`"\]]$/g, '');
  }

  // Token helper methods
  private isEof(): boolean {
    return this.pos >= this.tokens.length || this.tokens[this.pos].type === 'EOF';
  }

  private currentToken(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '', line: 0, column: 0 };
  }

  private advance(): Token {
    const token = this.currentToken();
    this.pos++;
    return token;
  }

  private checkKeyword(): boolean {
    return !this.isEof() && this.currentToken().type === 'KEYWORD';
  }

  private matchKeyword(kw: string): boolean {
    return !this.isEof() && this.currentToken().type === 'KEYWORD' && this.currentToken().value.toUpperCase() === kw.toUpperCase();
  }

  private peekKeyword(kw: string): boolean {
    if (this.pos + 1 >= this.tokens.length) return false;
    const token = this.tokens[this.pos + 1];
    return token.type === 'KEYWORD' && token.value.toUpperCase() === kw.toUpperCase();
  }

  private expectKeyword(kw: string): void {
    if (!this.matchKeyword(kw)) {
      throw new Error(`Expected keyword '${kw}' at line ${this.currentToken().line}, col ${this.currentToken().column}, found '${this.currentToken().value}'`);
    }
    this.advance();
  }

  private checkSymbol(sym: string): boolean {
    return !this.isEof() && this.currentToken().value === sym;
  }

  private expectSymbol(sym: string): void {
    if (!this.checkSymbol(sym)) {
      throw new Error(`Expected symbol '${sym}' at line ${this.currentToken().line}, col ${this.currentToken().column}, found '${this.currentToken().value}'`);
    }
    this.advance();
  }

  private checkIdentifier(): boolean {
    return !this.isEof() && (this.currentToken().type === 'IDENTIFIER' || this.currentToken().type === 'KEYWORD');
  }
}
