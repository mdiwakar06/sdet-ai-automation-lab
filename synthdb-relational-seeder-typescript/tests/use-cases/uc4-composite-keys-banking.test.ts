/**
 * Use Case 4: Composite Primary/Foreign Keys & Banking Ledger Test Suite
 */

import * as fs from 'fs';
import * as path from 'path';
import { SynthDB } from '../../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runUc4Test(): Promise<{ name: string; passed: boolean; assertions: number; durationMs: number }> {
  const startTime = performance.now();
  let assertions = 0;

  console.log('\n--- Running UC-4: Composite Keys & Banking Ledger Test ---');

  const schemaPath = path.resolve(__dirname, '../../samples/banking.sql');
  const ddl = fs.readFileSync(schemaPath, 'utf8');

  const engine = new SynthDB({
    seed: 5555,
    defaultRowCount: 20,
    rowCountPerTable: {
      branches: 5,
      accounts: 25,
      debit_cards: 25,
      transactions: 60
    },
    dialect: 'postgres',
    outputDir: 'output/uc4_banking'
  });

  const schema = engine.parseDdl(ddl);

  // 1. Composite PK AST Verification
  const accountsTable = schema.tables.find(t => t.name.toLowerCase() === 'accounts')!;
  assert(accountsTable.primaryKey.length === 2, `accounts must have composite PK of 2 columns, got ${accountsTable.primaryKey.length}`);
  assert(accountsTable.primaryKey.includes('branch_code') && accountsTable.primaryKey.includes('account_no'), 'accounts composite PK must consist of branch_code and account_no');
  assertions += 2;

  // 2. Composite FK AST Verification
  const cardsTable = schema.tables.find(t => t.name.toLowerCase() === 'debit_cards')!;
  assert(Boolean(cardsTable.compositeForeignKeys && cardsTable.compositeForeignKeys.length > 0), 'debit_cards must have composite foreign key');
  const cfk = cardsTable.compositeForeignKeys![0];
  assert(cfk.targetTable.toLowerCase() === 'accounts', 'composite FK must target accounts table');
  assert(cfk.sourceColumns.includes('branch_code') && cfk.sourceColumns.includes('account_no'), 'source columns must match composite PK');
  assertions += 3;

  // 3. Synthetic Database Generation
  const database = await engine.generate(schema);
  const branches = database.datasets.get('branches')!;
  const accounts = database.datasets.get('accounts')!;
  const cards = database.datasets.get('debit_cards')!;
  const transactions = database.datasets.get('transactions')!;

  // 4. Verify Composite PK Uniqueness in accounts
  const accountTuples = new Set<string>();
  for (const acc of accounts.rows) {
    const key = `${acc.branch_code}:::${acc.account_no}`;
    assert(!accountTuples.has(key), `Duplicate composite primary key detected in accounts: ${key}`);
    accountTuples.add(key);
  }
  assertions += accounts.rows.length;

  // 5. Verify Composite FK Referential Integrity in debit_cards & transactions
  for (const card of cards.rows) {
    const key = `${card.branch_code}:::${card.account_no}`;
    assert(accountTuples.has(key), `Composite FK ${key} in debit_cards must exist in accounts`);
  }
  assertions += cards.rows.length;

  for (const tx of transactions.rows) {
    const key = `${tx.branch_code}:::${tx.account_no}`;
    assert(accountTuples.has(key), `Composite FK ${key} in transactions must exist in accounts`);
  }
  assertions += transactions.rows.length;

  // 6. Verify Check Constraints (balance >= 0, amount > 0)
  for (const acc of accounts.rows) {
    assert(acc.balance >= 0, `Account balance ${acc.balance} must be >= 0`);
  }
  for (const tx of transactions.rows) {
    assert(tx.amount > 0, `Transaction amount ${tx.amount} must be > 0`);
  }
  assertions += accounts.rows.length + transactions.rows.length;

  // 7. Verify Branch SWIFT BIC format (8 to 11 chars)
  for (const b of branches.rows) {
    assert(typeof b.swift_bic === 'string' && b.swift_bic.length >= 8, `SWIFT BIC ${b.swift_bic} must be valid`);
  }
  assertions += branches.rows.length;

  const durationMs = performance.now() - startTime;
  console.log(`✔ UC-4 Passed: ${assertions} assertions verified in ${durationMs.toFixed(2)}ms`);

  return {
    name: 'UC-4: Composite Keys & Banking Ledger',
    passed: true,
    assertions,
    durationMs
  };
}

if (require.main === module) {
  runUc4Test().catch(err => {
    console.error('UC-4 Test Failed:', err);
    process.exit(1);
  });
}
