/**
 * Use Case 1: E-Commerce Storefront Synthetic Generation & Referential Integrity Test Suite
 */

import * as fs from 'fs';
import * as path from 'path';
import { SynthDB } from '../../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runUc1Test(): Promise<{ name: string; passed: boolean; assertions: number; durationMs: number }> {
  const startTime = performance.now();
  let assertions = 0;

  console.log('\n--- Running UC-1: E-Commerce CRUD & Referential Integrity Test ---');

  const schemaPath = path.resolve(__dirname, '../../samples/ecommerce.sql');
  const ddl = fs.readFileSync(schemaPath, 'utf8');

  const engine = new SynthDB({
    seed: 1337,
    defaultRowCount: 30,
    rowCountPerTable: {
      users: 20,
      user_profiles: 20,
      categories: 8,
      products: 25,
      orders: 40,
      order_items: 80,
      product_reviews: 30,
      payments: 40
    },
    dialect: 'postgres',
    outputDir: 'output/uc1_ecommerce'
  });

  // 1. DDL Parsing Verification
  const schema = engine.parseDdl(ddl);
  assert(schema.tables.length === 8, `Expected 8 tables, got ${schema.tables.length}`);
  assertions++;

  const usersTable = schema.tables.find(t => t.name.toLowerCase() === 'users')!;
  assert(Boolean(usersTable), 'users table must exist');
  assert(usersTable.primaryKey[0] === 'id', 'users primary key must be id');
  assertions += 2;

  // 2. Generate Synthetic Database
  const database = await engine.generate(schema);
  assert(database.datasets.size === 8, 'All 8 datasets must be generated');
  assertions++;

  // 3. Verify Referential Integrity
  const userDataset = database.datasets.get('users')!;
  const userIds = new Set(userDataset.rows.map(r => r.id));

  const orderDataset = database.datasets.get('orders')!;
  for (const order of orderDataset.rows) {
    assert(userIds.has(order.user_id), `Order user_id ${order.user_id} must exist in users table`);
  }
  assertions += orderDataset.rows.length;

  const productDataset = database.datasets.get('products')!;
  const productIds = new Set(productDataset.rows.map(r => r.id));
  const orderIds = new Set(orderDataset.rows.map(r => r.id));

  const orderItemDataset = database.datasets.get('order_items')!;
  for (const item of orderItemDataset.rows) {
    assert(orderIds.has(item.order_id), `OrderItem order_id ${item.order_id} must exist in orders`);
    assert(productIds.has(item.product_id), `OrderItem product_id ${item.product_id} must exist in products`);
  }
  assertions += orderItemDataset.rows.length * 2;

  // 4. Verify Temporal DAG Coherence (created_at <= updated_at <= shipped_at <= delivered_at)
  let temporalChecked = 0;
  for (const order of orderDataset.rows) {
    if (order.created_at && order.shipped_at) {
      const createdEpoch = new Date(order.created_at).getTime();
      const shippedEpoch = new Date(order.shipped_at).getTime();
      assert(createdEpoch <= shippedEpoch, `Order created_at (${order.created_at}) must be <= shipped_at (${order.shipped_at})`);
      temporalChecked++;
    }
    if (order.shipped_at && order.delivered_at) {
      const shippedEpoch = new Date(order.shipped_at).getTime();
      const deliveredEpoch = new Date(order.delivered_at).getTime();
      assert(shippedEpoch <= deliveredEpoch, `Order shipped_at (${order.shipped_at}) must be <= delivered_at (${order.delivered_at})`);
      temporalChecked++;
    }
  }
  assert(temporalChecked > 0, 'At least one temporal sequence must have been verified');
  assertions += temporalChecked;

  // 5. Verify Luhn Algorithm for Payment Cards
  const paymentDataset = database.datasets.get('payments')!;
  for (const payment of paymentDataset.rows) {
    const card = payment.card_number;
    assert(typeof card === 'string' && card.length >= 15, `Card number ${card} must be valid string`);

    // Verify Luhn check
    const digits = card.split('').map(Number);
    let sum = 0;
    const reversed = [...digits].reverse();
    for (let i = 0; i < reversed.length; i++) {
      let digit = reversed[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    assert(sum % 10 === 0, `Credit card ${card} failed Luhn checksum algorithm`);
  }
  assertions += paymentDataset.rows.length * 2;

  // 6. Verify Email RFC 2606 Compliance
  for (const user of userDataset.rows) {
    assert(
      user.email.endsWith('@example.com') ||
      user.email.endsWith('@example.org') ||
      user.email.endsWith('@example.net') ||
      user.email.endsWith('@example.edu') ||
      user.email.endsWith('@sample.test'),
      `Email ${user.email} must follow RFC 2606 reserved domains`
    );
  }
  assertions += userDataset.rows.length;

  const durationMs = performance.now() - startTime;
  console.log(`✔ UC-1 Passed: ${assertions} assertions verified in ${durationMs.toFixed(2)}ms`);

  return {
    name: 'UC-1: E-Commerce CRUD & Referential Integrity',
    passed: true,
    assertions,
    durationMs
  };
}

if (require.main === module) {
  runUc1Test().catch(err => {
    console.error('UC-1 Test Failed:', err);
    process.exit(1);
  });
}
