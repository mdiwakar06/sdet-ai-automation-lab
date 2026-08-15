/**
 * Use Case 5: Multi-Format Exporters, Docker Scaffolder & High-Throughput Benchmark Test Suite
 */

import * as fs from 'fs';
import * as path from 'path';
import { SynthDB } from '../../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runUc5Test(): Promise<{ name: string; passed: boolean; assertions: number; durationMs: number }> {
  const startTime = performance.now();
  let assertions = 0;

  console.log('\n--- Running UC-5: Exporters, Docker Scaffolder & Benchmark Test ---');

  const schemaPath = path.resolve(__dirname, '../../samples/ecommerce.sql');
  const ddl = fs.readFileSync(schemaPath, 'utf8');
  const outDir = path.resolve(__dirname, '../../output/uc5_benchmarks');

  const engine = new SynthDB({
    seed: 4242,
    defaultRowCount: 100,
    rowCountPerTable: {
      users: 150,
      user_profiles: 150,
      categories: 20,
      products: 200,
      orders: 300,
      order_items: 800,
      product_reviews: 200,
      payments: 300
    },
    dialect: 'postgres',
    formats: ['all'],
    outputDir: outDir,
    verbose: false
  });

  const schema = engine.parseDdl(ddl);

  // 1. High-Throughput Generation Benchmark (2,120 rows)
  const genStart = performance.now();
  const database = await engine.generate(schema);
  const genTime = performance.now() - genStart;

  let totalRows = 0;
  for (const ds of database.datasets.values()) {
    totalRows += ds.rows.length;
  }

  assert(totalRows === 2120, `Expected exactly 2,120 rows generated, got ${totalRows}`);
  const throughput = (totalRows / genTime) * 1000;
  console.log(`  ⚡ Benchmark: Generated ${totalRows} rows in ${genTime.toFixed(2)}ms (${Math.round(throughput).toLocaleString()} rows/sec)`);
  assert(throughput > 1000, `Throughput must exceed 1,000 rows/sec, achieved ${throughput}`);
  assertions += 2;

  // 2. Multi-Format Artifact Export
  const artifacts = await engine.exportArtifacts(database);
  assert(artifacts.length >= 4, `Expected at least 4 exported artifacts, got ${artifacts.length}`);
  assertions++;

  // 3. Verify SQL Batch File
  const sqlFile = path.join(outDir, 'synthdb_seed.sql');
  assert(fs.existsSync(sqlFile), 'synthdb_seed.sql must exist');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  assert(sqlContent.includes('INSERT INTO users'), 'SQL file must contain users INSERT');
  assert(sqlContent.includes('INSERT INTO orders'), 'SQL file must contain orders INSERT');
  assertions += 3;

  // 4. Verify NDJSON and CSV Files
  const usersNdjson = path.join(outDir, 'ndjson', 'users.ndjson');
  assert(fs.existsSync(usersNdjson), 'users.ndjson must exist');
  const ndjsonLines = fs.readFileSync(usersNdjson, 'utf8').trim().split('\n');
  assert(ndjsonLines.length === 150, `users.ndjson must have 150 lines, got ${ndjsonLines.length}`);
  const parsedFirstUser = JSON.parse(ndjsonLines[0]);
  assert(Boolean(parsedFirstUser.email), 'parsed NDJSON row must have email');
  assertions += 3;

  const ordersCsv = path.join(outDir, 'csv', 'orders.csv');
  assert(fs.existsSync(ordersCsv), 'orders.csv must exist');
  const csvLines = fs.readFileSync(ordersCsv, 'utf8').trim().split('\n');
  assert(csvLines.length === 301, `orders.csv must have header + 300 rows (301 lines), got ${csvLines.length}`);
  assertions += 2;

  // 5. Verify Docker Scaffolding
  const composeFile = path.join(outDir, 'docker', 'docker-compose.yml');
  const initSqlFile = path.join(outDir, 'docker', 'docker-entrypoint-initdb.d', '01_synthdb_seed.sql');
  assert(fs.existsSync(composeFile), 'docker-compose.yml must exist');
  assert(fs.existsSync(initSqlFile), 'initdb 01_synthdb_seed.sql must exist');
  const composeYaml = fs.readFileSync(composeFile, 'utf8');
  assert(composeYaml.includes('postgres:16-alpine'), 'docker compose must use postgres image');
  assertions += 3;

  // 6. Verify Standalone HTML ERD Dashboard
  const reportHtml = path.join(outDir, 'reports', 'synthdb-dashboard.html');
  assert(fs.existsSync(reportHtml), 'reports/synthdb-dashboard.html must exist');
  const htmlContent = fs.readFileSync(reportHtml, 'utf8');
  assert(htmlContent.includes('SynthDB Interactive Dashboard'), 'HTML must contain dashboard title');
  assert(htmlContent.includes('erDiagram'), 'HTML must contain Mermaid erDiagram');
  assert(htmlContent.includes('USERS ||--o{ ORDERS'), 'HTML must contain entity relationships in ERD');
  assertions += 4;

  const durationMs = performance.now() - startTime;
  console.log(`✔ UC-5 Passed: ${assertions} assertions verified in ${durationMs.toFixed(2)}ms`);

  return {
    name: 'UC-5: Exporters, Docker Scaffolding & High-Throughput Benchmark',
    passed: true,
    assertions,
    durationMs
  };
}

if (require.main === module) {
  runUc5Test().catch(err => {
    console.error('UC-5 Test Failed:', err);
    process.exit(1);
  });
}
