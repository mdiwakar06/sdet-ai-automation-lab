/**
 * SynthDB - Semantic Column Data Synthesizer
 * Maps column semantics, SQL data types, and check constraints to realistic domain synthetic values.
 */

import { Prng } from './Prng';
import { DistributionSampler } from './DistributionSampler';
import { PiiPatterns } from '../utils/piiPatterns';
import { ColumnDefinition, TableDefinition } from '../types';

export class SemanticSynthesizer {
  private prng: Prng;
  private sampler: DistributionSampler;
  private customVocabularies: Record<string, string[]> = {};

  constructor(prng: Prng, customVocabularies: Record<string, string[]> = {}) {
    this.prng = prng;
    this.sampler = new DistributionSampler(prng);
    this.customVocabularies = customVocabularies;
  }

  public setCustomVocabularies(vocab: Record<string, string[]>): void {
    this.customVocabularies = { ...this.customVocabularies, ...vocab };
  }

  /**
   * Synthesizes a realistic semantic value for a column.
   */
  public synthesizeColumnValue(
    table: TableDefinition,
    column: ColumnDefinition,
    rowIndex: number,
    currentRow: Record<string, any>
  ): any {
    const colName = column.name.toLowerCase();
    const tableName = table.name.toLowerCase();
    const tableColKey = `${tableName}.${colName}`;

    // Check custom vocabulary override
    if (this.customVocabularies[tableColKey] && this.customVocabularies[tableColKey].length > 0) {
      return this.prng.pick(this.customVocabularies[tableColKey]);
    }

    // Check ENUM constraints
    if (column.enumValues && column.enumValues.length > 0) {
      return this.prng.pick(column.enumValues);
    }

    // Check Auto-increment
    if (column.isAutoIncrement) {
      return rowIndex + 1;
    }

    // Check Nullability (10% chance of null for nullable columns unless primary key)
    if (column.isNullable && !column.isPrimaryKey && !colName.includes('token') && !colName.includes('hash')) {
      if (this.prng.next() < 0.05) {
        return null;
      }
    }

    // Check if column is a UUID
    if (column.normalizedType === 'uuid' || colName.endsWith('_uuid') || colName === 'uuid' || colName === 'guid') {
      return PiiPatterns.uuid(this.prng);
    }

    // 1. Identity & Contact Semantics
    if (colName.includes('email')) {
      const fn = currentRow['first_name'] || currentRow['firstName'];
      const ln = currentRow['last_name'] || currentRow['lastName'];
      return PiiPatterns.email(this.prng, fn, ln);
    }
    if (colName.includes('phone') || colName.includes('mobile') || colName.includes('fax') || colName.includes('tel')) {
      return PiiPatterns.phoneNumber(this.prng);
    }
    if (colName === 'first_name' || colName === 'firstname' || colName === 'fname') {
      return this.prng.pick(PiiPatterns.FIRST_NAMES);
    }
    if (colName === 'last_name' || colName === 'lastname' || colName === 'lname' || colName === 'surname') {
      return this.prng.pick(PiiPatterns.LAST_NAMES);
    }
    if (colName === 'full_name' || colName === 'fullname' || colName === 'name' && tableName.includes('user')) {
      return `${this.prng.pick(PiiPatterns.FIRST_NAMES)} ${this.prng.pick(PiiPatterns.LAST_NAMES)}`;
    }
    if (colName.includes('username') || colName.includes('login') || colName.includes('handle')) {
      const fn = (currentRow['first_name'] || this.prng.pick(PiiPatterns.FIRST_NAMES)).toLowerCase();
      const num = this.prng.nextInt(10, 9999);
      return `${fn}_${num}`;
    }

    // 2. Security & Auth Semantics
    if (colName.includes('password') || colName.includes('pass_hash') || colName.includes('hash')) {
      return PiiPatterns.passwordHash(this.prng);
    }
    if (colName.includes('api_key') || colName.includes('secret_key') || colName.includes('token') || colName.includes('auth_token')) {
      return PiiPatterns.apiKey(this.prng, colName.includes('secret') ? 'sk_live_' : 'pk_live_');
    }
    if (colName.includes('user_agent') || colName.includes('useragent')) {
      return this.prng.pick(PiiPatterns.USER_AGENTS);
    }
    if (colName.includes('ip_address') || colName.includes('ipv4') || colName === 'ip') {
      return PiiPatterns.ipv4(this.prng);
    }
    if (colName.includes('ipv6')) {
      return PiiPatterns.ipv6(this.prng);
    }
    if (colName.includes('mac_address') || colName.includes('mac')) {
      return Array.from({ length: 6 }, () => this.prng.nextInt(0, 255).toString(16).padStart(2, '0')).join(':');
    }
    if (colName.includes('ssn') || colName.includes('social_security')) {
      return PiiPatterns.ssn(this.prng);
    }

    // 3. Financial & Banking Semantics
    if (colName.includes('card_number') || colName.includes('card_no') || colName.includes('credit_card')) {
      return PiiPatterns.creditCard(this.prng, this.prng.pick(['visa', 'mastercard', 'amex']));
    }
    if (colName.includes('cvv') || colName.includes('cvc') || colName.includes('security_code')) {
      return String(this.prng.nextInt(100, 999));
    }
    if (colName.includes('iban')) {
      return PiiPatterns.iban(this.prng);
    }
    if (colName.includes('swift') || colName.includes('bic')) {
      return PiiPatterns.swiftBic(this.prng);
    }
    if (colName.includes('currency')) {
      return this.prng.pick(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF']);
    }
    if (colName.includes('price') || colName.includes('amount') || colName.includes('cost') || colName.includes('total') || colName.includes('subtotal') || colName.includes('balance') || colName.includes('salary')) {
      const decimals = column.scale !== undefined ? column.scale : 2;
      let val = this.sampler.normal(120.0, 85.0, 1.0, 5000.0);
      if (colName.includes('balance')) val = this.sampler.normal(4500.0, 3000.0, 50.0, 100000.0);
      if (colName.includes('salary')) val = this.sampler.normal(95000.0, 25000.0, 40000.0, 250000.0);
      if (column.normalizedType === 'integer' || column.normalizedType === 'bigint') {
        return Math.round(val);
      }
      return parseFloat(val.toFixed(decimals));
    }
    if (colName.includes('discount') || colName.includes('rate') || colName.includes('tax') || colName.includes('percent')) {
      const rate = this.prng.nextFloat(0.0, 30.0, 2);
      return column.normalizedType === 'integer' ? Math.round(rate) : rate;
    }

    // 4. Geographic & Address Semantics
    if (colName.includes('street') || colName === 'address' || colName === 'address_line_1' || colName === 'address1') {
      const num = this.prng.nextInt(100, 9999);
      const st = this.prng.pick(PiiPatterns.STREET_NAMES);
      return `${num} ${st}`;
    }
    if (colName.includes('city')) {
      return this.prng.pick(PiiPatterns.CITIES).city;
    }
    if (colName.includes('state') || colName.includes('province') || colName.includes('region')) {
      return this.prng.pick(PiiPatterns.CITIES).state;
    }
    if (colName.includes('country')) {
      return this.prng.pick(PiiPatterns.CITIES).country;
    }
    if (colName.includes('zip') || colName.includes('postal')) {
      return this.prng.pick(PiiPatterns.CITIES).zip;
    }
    if (colName.includes('latitude') || colName === 'lat') {
      return this.prng.nextFloat(25.0, 48.0, 6);
    }
    if (colName.includes('longitude') || colName === 'lng' || colName === 'lon') {
      return this.prng.nextFloat(-122.0, -71.0, 6);
    }

    // 5. E-commerce & SaaS Semantics
    if (colName.includes('company') || colName.includes('organization') || colName.includes('tenant') && !colName.endsWith('_id')) {
      const p = this.prng.pick(PiiPatterns.COMPANY_PREFIXES);
      const s = this.prng.pick(PiiPatterns.COMPANY_SUFFIXES);
      return `${p} ${s}`;
    }
    if (colName === 'sku' || colName.includes('sku_code')) {
      const prefix = this.prng.pick(['SKU', 'PROD', 'ITM', 'SYS', 'MOD']);
      const code = this.prng.nextInt(1000, 9999);
      return `${prefix}-${code}`;
    }
    if (colName.includes('product_name') || (colName === 'name' && tableName.includes('product'))) {
      const adj = this.prng.pick(PiiPatterns.PRODUCT_ADJECTIVES);
      const noun = this.prng.pick(PiiPatterns.PRODUCT_NOUNS);
      return `${adj} ${noun}`;
    }
    if (colName.includes('slug')) {
      const base = (currentRow['name'] || currentRow['title'] || `item-${rowIndex + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return `${base}-${this.prng.nextInt(100, 999)}`;
    }
    if (colName.includes('status') || colName === 'state') {
      if (tableName.includes('order')) {
        return this.prng.pick(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
      }
      if (tableName.includes('payment')) {
        return this.prng.pick(['authorized', 'captured', 'settled', 'refunded', 'failed']);
      }
      if (tableName.includes('task')) {
        return this.prng.pick(['todo', 'in_progress', 'in_review', 'done', 'blocked']);
      }
      return this.prng.pick(['active', 'inactive', 'pending', 'archived']);
    }
    if (colName.includes('role')) {
      return this.prng.pick(PiiPatterns.ROLES);
    }
    if (colName.includes('tier') || colName.includes('plan')) {
      return this.prng.pick(['starter', 'professional', 'enterprise', 'custom']);
    }
    if (colName.includes('description') || colName.includes('bio') || colName.includes('notes') || colName.includes('summary')) {
      return `Detailed synthetic description for ${tableName} record ${rowIndex + 1}. Features high-performance architecture and reliability.`;
    }
    if (colName.includes('title') || colName.includes('headline')) {
      return `Operational Task #${rowIndex + 1}: ${this.prng.pick(['Optimize workflow', 'Review metrics', 'Configure integration', 'Sync database'])}`;
    }

    // 6. Generic Type-based fallback
    switch (column.normalizedType) {
      case 'boolean':
        return this.prng.nextBoolean(0.7);

      case 'integer':
      case 'bigint':
      case 'smallint':
        if (colName.includes('quantity') || colName.includes('qty') || colName.includes('count') || colName.includes('items')) {
          return this.prng.nextInt(1, 10);
        }
        if (colName.includes('rating') || colName.includes('score')) {
          return this.prng.nextInt(1, 5);
        }
        if (colName.includes('age')) {
          return this.prng.nextInt(18, 75);
        }
        if (colName.includes('year')) {
          return this.prng.nextInt(2018, 2026);
        }
        if (column.isPrimaryKey) {
          return rowIndex + 1;
        }
        return this.prng.nextInt(1, 1000);

      case 'float':
      case 'decimal':
        return this.prng.nextFloat(1.0, 1000.0, column.scale || 2);

      case 'json':
        return JSON.stringify({
          version: '1.0',
          tier: this.prng.pick(['standard', 'premium']),
          flags: {
            betaEnabled: this.prng.nextBoolean(0.3),
            notifications: true,
            theme: this.prng.pick(['dark', 'light', 'system'])
          },
          tags: this.prng.sample(['ai', 'relational', 'fast', 'secure', 'cloud', 'enterprise'], 2)
        });

      case 'date': {
        const d = new Date(this.prng.nextInt(2020, 2024), this.prng.nextInt(0, 11), this.prng.nextInt(1, 28));
        return d.toISOString().split('T')[0];
      }

      case 'timestamp': {
        const d = new Date(this.prng.nextInt(2020, 2024), this.prng.nextInt(0, 11), this.prng.nextInt(1, 28), this.prng.nextInt(0, 23), this.prng.nextInt(0, 59), this.prng.nextInt(0, 59));
        return d.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
      }

      case 'char':
      case 'varchar':
      case 'text':
      default: {
        if (colName.includes('account_no') || colName.includes('acc_num') || colName.includes('account_number')) {
          const num = 1000000000 + rowIndex * 17 + this.prng.nextInt(1, 9);
          return String(num);
        }
        if (colName.includes('branch_code') || colName.includes('branch_id')) {
          return `BR-${String(rowIndex + 1).padStart(4, '0')}`;
        }
        const len = column.length || 20;
        const idxStr = `${rowIndex + 1}`;
        if (len <= 10) {
          const prefix = colName.substring(0, Math.max(1, len - idxStr.length - 1));
          return `${prefix}_${idxStr}`;
        }
        const textVal = `${colName.substring(0, 8)}_${idxStr}_${this.prng.nextInt(100, 999)}`;
        return textVal.length > len ? textVal.substring(0, len) : textVal;
      }
    }
  }
}
