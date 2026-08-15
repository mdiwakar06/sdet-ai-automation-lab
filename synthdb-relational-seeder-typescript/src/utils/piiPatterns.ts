/**
 * SynthDB - Safe PII & Domain Pattern Generators
 * Compliant with:
 * - RFC 2606 (Reserved Top Level DNS Names & Example Domains)
 * - RFC 5737 (IPv4 Address Blocks Reserved for Documentation)
 * - RFC 3849 (IPv6 Address Prefix Reserved for Documentation)
 * - NANPA 555 (Fictional Telephone Numbers: 555-0100 through 555-0199)
 * - ISO/IEC 7812 (Luhn Algorithm for Test Credit Cards)
 */

import { Prng } from '../generator/Prng';

export class PiiPatterns {
  public static readonly FIRST_NAMES = [
    'Alexander', 'Ava', 'Benjamin', 'Charlotte', 'Daniel', 'Emma', 'Ethan', 'Harper',
    'Henry', 'Isabella', 'James', 'Liam', 'Lucas', 'Mia', 'Noah', 'Olivia', 'Sophia',
    'William', 'Elijah', 'Amelia', 'Oliver', 'Evelyn', 'Mateo', 'Abigail', 'Theodore',
    'Emily', 'Sebastian', 'Elizabeth', 'Jack', 'Mila', 'Samuel', 'Ella', 'David', 'Avery',
    'Joseph', 'Sofia', 'John', 'Camila', 'Owen', 'Aria', 'Wyatt', 'Scarlett', 'Julian',
    'Victoria', 'Luke', 'Madison', 'Grayson', 'Luna', 'Levi', 'Grace', 'Isaac', 'Chloe',
    'Gabriel', 'Penelope', 'Anthony', 'Layla', 'Jaxon', 'Riley', 'Lincoln', 'Zoey'
  ];

  public static readonly LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
    'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy'
  ];

  public static readonly RFC2606_DOMAINS = [
    'example.com',
    'example.org',
    'example.net'
  ];

  public static readonly STREET_NAMES = [
    'Oak Street', 'Maple Avenue', 'Cedar Boulevard', 'Pine Road', 'Elm Drive',
    'Washington Court', 'Lakeview Lane', 'Highland Way', 'Sunset Parkway', 'Park Circle',
    'Riverfront Terrace', 'Main Street', 'Market Street', 'Broadway', 'Meadowbrook Path'
  ];

  public static readonly CITIES = [
    { city: 'Springfield', state: 'IL', zip: '62701', country: 'USA' },
    { city: 'Seattle', state: 'WA', zip: '98101', country: 'USA' },
    { city: 'Austin', state: 'TX', zip: '78701', country: 'USA' },
    { city: 'Boston', state: 'MA', zip: '02108', country: 'USA' },
    { city: 'Denver', state: 'CO', zip: '80202', country: 'USA' },
    { city: 'Portland', state: 'OR', zip: '97201', country: 'USA' },
    { city: 'Atlanta', state: 'GA', zip: '30303', country: 'USA' },
    { city: 'San Jose', state: 'CA', zip: '95113', country: 'USA' },
    { city: 'Miami', state: 'FL', zip: '33101', country: 'USA' },
    { city: 'Chicago', state: 'IL', zip: '60601', country: 'USA' },
    { city: 'New York', state: 'NY', zip: '10001', country: 'USA' },
    { city: 'Toronto', state: 'ON', zip: 'M5H 2N2', country: 'CAN' },
    { city: 'Vancouver', state: 'BC', zip: 'V6B 1A1', country: 'CAN' },
    { city: 'London', state: 'GL', zip: 'EC1A 1BB', country: 'GBR' },
    { city: 'Berlin', state: 'BE', zip: '10115', country: 'DEU' }
  ];

  public static readonly COMPANY_PREFIXES = [
    'Apex', 'Quantum', 'Nexus', 'Starlight', 'Aero', 'Vertex', 'Synthetix', 'Synergy',
    'Omni', 'Titan', 'Vanguard', 'Hyperion', 'Prism', 'Stratum', 'Echo', 'Catalyst'
  ];

  public static readonly COMPANY_SUFFIXES = [
    'Technologies', 'Solutions', 'Labs', 'Logistics', 'Analytics', 'Systems', 'Ventures',
    'Dynamics', 'Networks', 'Global', 'Capital', 'Cloud', 'Enterprises', 'Group'
  ];

  public static readonly PRODUCT_ADJECTIVES = [
    'Ultra', 'Pro', 'Elite', 'Ergonomic', 'Smart', 'Wireless', 'Compact', 'Precision',
    'Rugged', 'Quantum', 'Adaptive', 'Turbo', 'Modular', 'Dynamic', 'Eco-Friendly'
  ];

  public static readonly PRODUCT_NOUNS = [
    'Keyboard', 'Display Monitor', 'Noise-Canceling Headset', 'Power Hub', 'Smartwatch',
    'Mechanical Switch', 'Sensor Hub', 'Router', 'Webcam', 'Thermal Pad', 'Storage Array',
    'Docking Station', 'Graphics Unit', 'Microphone', 'Trackpad'
  ];

  public static readonly ROLES = [
    'admin', 'user', 'moderator', 'editor', 'viewer', 'developer', 'billing_manager', 'support_agent'
  ];

  public static readonly USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
  ];

  /**
   * RFC 2606 Compliant Safe Email
   */
  public static email(prng: Prng, firstName?: string, lastName?: string): string {
    const fn = (firstName || prng.pick(this.FIRST_NAMES)).toLowerCase().replace(/[^a-z]/g, '');
    const ln = (lastName || prng.pick(this.LAST_NAMES)).toLowerCase().replace(/[^a-z]/g, '');
    const num = prng.nextInt(10, 9999);
    const domain = prng.pick(this.RFC2606_DOMAINS);
    return `${fn}.${ln}${num}@${domain}`;
  }

  /**
   * NANPA 555-0100 through 555-0199 Fictional Phone Number
   */
  public static phoneNumber(prng: Prng): string {
    const areaCode = prng.nextInt(201, 989);
    const lineNum = prng.nextInt(100, 199);
    return `+1-${areaCode}-555-0${lineNum - 100 < 10 ? '0' + (lineNum - 100) : lineNum - 100}`;
  }

  /**
   * RFC 5737 Documentation IPv4 Address
   */
  public static ipv4(prng: Prng): string {
    // Blocks: 192.0.2.0/24 (TEST-NET-1), 198.51.100.0/24 (TEST-NET-2), 203.0.113.0/24 (TEST-NET-3)
    const blocks = ['192.0.2.', '198.51.100.', '203.0.113.'];
    const prefix = prng.pick(blocks);
    const host = prng.nextInt(1, 254);
    return `${prefix}${host}`;
  }

  /**
   * RFC 3849 Documentation IPv6 Address
   */
  public static ipv6(prng: Prng): string {
    const part1 = prng.nextInt(0x1000, 0xffff).toString(16);
    const part2 = prng.nextInt(0x1000, 0xffff).toString(16);
    const part3 = prng.nextInt(0x1, 0xffff).toString(16);
    return `2001:db8:${part1}:${part2}::${part3}`;
  }

  /**
   * Luhn Algorithm Valid Fictional Credit Card Number
   */
  public static creditCard(prng: Prng, type: 'visa' | 'mastercard' | 'amex' = 'visa'): string {
    let prefix = '400000'; // Test Visa BIN
    let length = 16;

    if (type === 'mastercard') {
      prefix = '510000'; // Test MasterCard BIN
      length = 16;
    } else if (type === 'amex') {
      prefix = '370000'; // Test Amex BIN
      length = 15;
    }

    const digits: number[] = prefix.split('').map(Number);
    while (digits.length < length - 1) {
      digits.push(prng.nextInt(0, 9));
    }

    // Calculate Luhn check digit
    let sum = 0;
    const reversed = [...digits].reverse();
    for (let i = 0; i < reversed.length; i++) {
      let digit = reversed[i];
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    digits.push(checkDigit);

    return digits.join('');
  }

  /**
   * Reserved Fictional SSN (Area 900-999 or Group 00 or Serial 0000)
   */
  public static ssn(prng: Prng): string {
    const area = prng.nextInt(900, 989); // 900+ is SSA unassigned
    const group = prng.nextInt(10, 99);
    const serial = prng.nextInt(1000, 9999);
    return `${area}-${group}-${serial}`;
  }

  /**
   * Fictional IBAN (ISO 13616)
   */
  public static iban(prng: Prng, countryCode = 'DE'): string {
    const check = prng.nextInt(10, 98);
    const bankCode = prng.nextInt(10000000, 99999999);
    const accountNo = prng.nextInt(1000000000, 9999999999);
    return `${countryCode}${check}${bankCode}${accountNo}`;
  }

  /**
   * Fictional SWIFT / BIC Code
   */
  public static swiftBic(prng: Prng): string {
    const bank = prng.pick(['SYNT', 'DEMO', 'TEST', 'SPEC', 'NOOP', 'MOCK']);
    const country = 'US';
    const location = prng.pick(['33', '44', '66', '88']);
    const branch = prng.pick(['XXX', '100', '200', '999']);
    return `${bank}${country}${location}${branch}`;
  }

  /**
   * Deterministic UUID v4 generator
   */
  public static uuid(prng: Prng): string {
    const hex = '0123456789abcdef';
    let uuid = '';
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-';
      } else if (i === 14) {
        uuid += '4'; // version 4
      } else if (i === 19) {
        uuid += hex[(prng.nextInt(0, 15) & 0x3) | 0x8]; // variant RFC4122
      } else {
        uuid += hex[prng.nextInt(0, 15)];
      }
    }
    return uuid;
  }

  /**
   * Mock Bcrypt Password Hash ($2a$12$...)
   */
  public static passwordHash(prng: Prng): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
    let salt = '';
    for (let i = 0; i < 22; i++) {
      salt += chars[prng.nextInt(0, chars.length - 1)];
    }
    let hash = '';
    for (let i = 0; i < 31; i++) {
      hash += chars[prng.nextInt(0, chars.length - 1)];
    }
    return `$2a$12$${salt}${hash}`;
  }

  /**
   * API Key Generator
   */
  public static apiKey(prng: Prng, prefix = 'sk_live_'): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = prefix;
    for (let i = 0; i < 32; i++) {
      key += chars[prng.nextInt(0, chars.length - 1)];
    }
    return key;
  }
}
