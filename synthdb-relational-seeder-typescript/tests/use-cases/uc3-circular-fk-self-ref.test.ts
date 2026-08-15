/**
 * Use Case 3: Mutual Circular Foreign Keys & Self-Referential Tree Resolution Test Suite
 */

import * as fs from 'fs';
import * as path from 'path';
import { SynthDB, CycleResolver, SqlBatchExporter } from '../../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runUc3Test(): Promise<{ name: string; passed: boolean; assertions: number; durationMs: number }> {
  const startTime = performance.now();
  let assertions = 0;

  console.log('\n--- Running UC-3: Circular FK & Self-Referential Graph Test ---');

  const schemaPath = path.resolve(__dirname, '../../samples/circular.sql');
  const ddl = fs.readFileSync(schemaPath, 'utf8');

  const engine = new SynthDB({
    seed: 777,
    defaultRowCount: 20,
    rowCountPerTable: {
      departments: 6,
      employees: 30
    },
    dialect: 'postgres',
    outputDir: 'output/uc3_circular'
  });

  const schema = engine.parseDdl(ddl);

  // 1. Tarjan SCC Cycle Detection Verification
  const cycleResult = CycleResolver.resolve(schema.tables);
  assert(cycleResult.hasCycles === true, 'Tarjan detector must flag circular/self-referential dependencies');
  assert(cycleResult.selfReferentialTables.includes('employees'), 'employees must be detected as self-referential');
  assertions += 2;

  // 2. Generation & 2-Pass Execution
  const database = await engine.generate(schema);
  assert(database.datasets.size === 2, 'Both cyclic tables must be generated');
  assert(database.twoPassPlan.length > 0, '2-Pass update plan must be constructed');
  assertions += 2;

  const deptDataset = database.datasets.get('departments')!;
  const empDataset = database.datasets.get('employees')!;
  const deptIds = new Set(deptDataset.rows.map(r => r.id));
  const empIds = new Set(empDataset.rows.map(r => r.id));

  // 3. Verify Foreign Keys in Employees
  for (const emp of empDataset.rows) {
    // department_id must exist
    assert(deptIds.has(emp.department_id), `Employee department_id ${emp.department_id} must exist in departments`);
    // reports_to_id must be null (roots) or exist in empIds
    if (emp.reports_to_id !== null && emp.reports_to_id !== undefined) {
      assert(empIds.has(emp.reports_to_id), `Employee reports_to_id ${emp.reports_to_id} must exist in employees`);
    }
  }
  assertions += empDataset.rows.length * 2;

  // 4. Verify Pass 2 Department Manager FK Resolution
  assert(deptDataset.pass2Updates !== undefined && deptDataset.pass2Updates.length > 0, 'Pass 2 updates for departments must exist');
  for (const update of deptDataset.pass2Updates!) {
    const mgrId = update.updateValues.manager_id;
    assert(empIds.has(mgrId), `Deferred manager_id ${mgrId} in Pass 2 update must reference a valid employee ID`);
  }
  assertions += deptDataset.pass2Updates!.length;

  // 5. Verify SQL Batch Export contains both Pass 1 Inserts and Pass 2 UPDATE statements
  const sql = SqlBatchExporter.generateSql(schema, database.datasets, 'postgres');
  assert(sql.includes('INSERT INTO departments'), 'SQL script must contain Pass 1 INSERT INTO departments');
  assert(sql.includes('INSERT INTO employees'), 'SQL script must contain Pass 1 INSERT INTO employees');
  assert(sql.includes('UPDATE departments SET manager_id ='), 'SQL script must contain Pass 2 UPDATE statements');
  assertions += 3;

  const durationMs = performance.now() - startTime;
  console.log(`✔ UC-3 Passed: ${assertions} assertions verified in ${durationMs.toFixed(2)}ms`);

  return {
    name: 'UC-3: Circular FK & Self-Referential Graph',
    passed: true,
    assertions,
    durationMs
  };
}

if (require.main === module) {
  runUc3Test().catch(err => {
    console.error('UC-3 Test Failed:', err);
    process.exit(1);
  });
}
