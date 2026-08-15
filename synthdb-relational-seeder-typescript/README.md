# 🗄️ SynthDB • PII-Safe Relational Test Database Seeder & Synthesizer

> **Enterprise-grade, deterministic relational synthetic database generator, seeder, and SDET test fixture engine written in TypeScript.**

---

## 💡 What is SynthDB in Simple Terms?

Every developer, SDET, and QA engineer knows the frustration of needing a realistic database for local development, staging environments, and Playwright/Cypress E2E test runs.

Until now, engineering teams were forced to choose between **two bad options**:

### ❌ Option 1: Dumping the Production Database
* **The Risk**: Severe legal violations (**GDPR Art. 4, HIPAA Safe Harbor, SOC 2 Type II**).
* Real customer passwords, emails, phone numbers, home addresses, and credit cards end up copied onto developer laptops and insecure test runners. One lost laptop or leaked backup means multi-million dollar regulatory fines and PR disaster.

### ❌ Option 2: Writing Manual SQL Seed Scripts (`seed.sql`)
* **The Pain**: Incredibly brittle, tedious, and fragile.
* The moment a backend developer adds a new Foreign Key (`user_id`), migration, or `NOT NULL` constraint, all hand-written test scripts crash with constraint violations (`FOREIGN KEY constraint failed`, `NOT NULL constraint failed`). Engineers spend hours fixing broken fixtures instead of building features.

---

## ✨ How SynthDB Solves This (The Solution)

**SynthDB gives you production-realistic test databases from raw SQL DDL files alone—with ZERO production data, ZERO manual script writing, and 100% referential integrity.**

```
[ Your Raw SQL Schema DDL (Postgres / MySQL / SQLite) ]
                          │
                          ▼
            [ 🗄️ SynthDB Engine ]
                          │
  ┌───────────────────────┼────────────────────────┐
  ▼                       ▼                        ▼
1. Topological DAG:     2. Statistical Realism:  3. PII-Safe Synthesis:
   Resolves table orders   Zipfian skew (20% top    RFC 2606 (@example.com)
   & circular FK cycles    products in 80% orders)  555-01xx fictional phones
   via 2-Pass updates      Monotonic dates          Luhn-valid test cards
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│ 🚀 Ready-to-Use Outputs in < 1 Second:                    │
│ • Chunked Multi-Row SQL Dumps (Postgres, MySQL, SQLite)   │
│ • Direct Binary SQLite .db Database Files                 │
│ • Streaming NDJSON & RFC 4180 CSV Fixtures                │
│ • Instant Docker Scaffolding (docker-compose.yml + initdb)│
│ • Interactive HTML Schema ERD & Live Data Table Dashboard │
└───────────────────────────────────────────────────────────┘
```

---

## 🎯 Who Is This For?

| Role | How SynthDB Solves Your Daily Headache |
| :--- | :--- |
| **SDETs & QA Architects** | Spin up isolated, pre-seeded test databases for parallel CI test runs with bit-for-bit seed reproducibility (`--seed 1337`). Zero test flakes caused by missing fixtures. |
| **Backend & Full-Stack Devs** | Get 10,000+ realistic relational records for local Docker development in seconds without writing manual `INSERT` statements. |
| **DevOps & Platform Engineers** | Eliminate the operational nightmare of managing and sanitizing gigabyte-sized production database dumps. |
| **CTOs, CISOs & Compliance** | Guarantees 100% compliance with GDPR, HIPAA, and SOC 2 Type II by eliminating customer data from all non-production environments. |

---

## 🚀 Key Architectural Features

1. **SQL DDL AST Lexer & Parser**:
   - State-machine character tokenizer handling block (`/* */`) and line (`--`, `#`) comments, nested parentheses (`DECIMAL(10,2)`, `DEFAULT (datetime('now'))`), schema prefixes (`public.users`), and escaped literals.
   - AST extractor for primary keys, composite PKs, foreign keys, composite FKs, unique constraints, check constraints, default values, enums, and generated/virtual columns.
   - Dialect Normalizer supporting PostgreSQL (`SERIAL`, `UUID`, `JSONB`, `TIMESTAMPTZ`), MySQL (`AUTO_INCREMENT`, `TINYINT(1)`), and SQLite (`INTEGER PRIMARY KEY AUTOINCREMENT`).

2. **Graph Dependency & Cycle Resolution Engine**:
   - **Dependency Graph**: Builds table relational DAG $G=(V, E)$.
   - **Deterministic Kahn's Sorter**: Alphabetical tie-breaking on zero in-degree candidate nodes for reproducible topological generation sequences.
   - **Tarjan's SCC & 2-Pass Update Planner**: Detects mutual circular FK dependencies (`departments.manager_id` $\leftrightarrow$ `employees.department_id`) and self-referential trees (`employees.reports_to_id`). Pass 1 inserts rows with deferred FKs; Pass 2 generates `UPDATE` statements to link relationships with 100% referential integrity.

3. **Deterministic Generation & Statistical Sampling**:
   - **PRNG**: Pure 32-bit bitwise XorShift128+ & SplitMix32 deterministic seeded PRNG (`--seed <number>`).
   - **Distributions**: Uniform, Gaussian / Normal (Box-Muller transform), and discrete Zipfian / Power-Law ($\alpha = 1.15$) for skewed product popularity.
   - **Temporal DAG Chain**: Enforces chronological sanity across row timestamps ($\text{created\_at} \le \text{updated\_at} \le \text{shipped\_at} \le \text{delivered\_at} \le \text{deleted\_at}$).
   - **UniqueGuard**: Single and composite unique constraint collision tracking with deterministic sequence fallback.
   - **ReferentialPool**: In-memory primary key storage with $O(1)$ constant memory Reservoir Sampling for foreign keys.

4. **Practitioner PII & Domain Standards Compliance**:
   - **RFC 2606**: Reserved safe domain emails (`@example.com`, `@example.org`, `@example.net`).
   - **NANPA 555**: Fictional telephone numbers (`+1-NXX-555-01XX`).
   - **RFC 5737 / RFC 3849**: Documentation IPv4 (`198.51.100.0/24`) and IPv6 (`2001:db8::/32`).
   - **ISO/IEC 7812**: Luhn-valid fictional test credit cards (Visa `400000...`, MasterCard `510000...`).
   - **SSA Safe Numbers**: Fictional SSN area 900+ series.
   - **AI Contextual Advisor**: Gemini 2.5 Flash schema analyzer with heuristic offline fallback.

5. **Multi-Format Exporters & Scaffolding**:
   - **Chunked SQL Batch Exporter**: Multi-row `INSERT INTO ... VALUES (...)` with dialect-specific FK toggles (`PRAGMA foreign_keys = OFF;`, `SET FOREIGN_KEY_CHECKS = 0;`, `SET CONSTRAINTS ALL DEFERRED;`).
   - **NDJSON & CSV Exporters**: Streaming fixtures for data pipelines and test suites.
   - **Docker Scaffolder**: Generates `docker-compose.yml` and `/docker-entrypoint-initdb.d/01_synthdb_seed.sql` for instant container startup.
   - **Interactive HTML ERD Dashboard**: Standalone dashboard with Mermaid.js ERD visualization, dataset explorer, and topological DAG inspect.

---

## 📦 Project Structure

```
synthdb-relational-seeder-typescript/
├── bin/
│   └── synthdb.ts                   # CLI entry point
├── src/
│   ├── ai/
│   │   └── ContextualAdvisor.ts     # Gemini 2.5 Flash domain advisor
│   ├── exporters/
│   │   ├── DockerScaffolder.ts      # Docker compose & initdb scaffolder
│   │   ├── JsonCsvExporter.ts       # NDJSON & CSV fixture generator
│   │   ├── SqlBatchExporter.ts      # Chunked SQL batch insert generator
│   │   └── SqliteBinaryExporter.ts  # Direct SQLite .db database builder
│   ├── generator/
│   │   ├── DistributionSampler.ts   # Uniform, Gaussian, Zipfian samplers
│   │   ├── PiiPatterns.ts           # RFC 2606, NANPA 555, RFC 5737, Luhn PII
│   │   ├── Prng.ts                  # XorShift128+ bitwise seeded PRNG
│   │   ├── ReferentialPool.ts       # Foreign key reservoir sampling pool
│   │   ├── RowSynthesizer.ts        # Table row generation orchestrator
│   │   ├── SemanticSynthesizer.ts   # Column semantic domain mapping
│   │   ├── TemporalChain.ts         # Topological temporal DAG enforcer
│   │   └── UniqueGuard.ts           # Single & composite unique collision guard
│   ├── graph/
│   │   ├── CycleResolver.ts         # Tarjan's SCC & 2-pass update planner
│   │   ├── DependencyGraph.ts       # Table dependency DAG builder
│   │   └── TopologicalSorter.ts     # Deterministic Kahn's topological sorter
│   ├── parser/
│   │   ├── DdlParser.ts             # SQL DDL AST parser
│   │   ├── DialectNormalizer.ts     # Vendor SQL type normalizer
│   │   └── SqlLexer.ts              # Character state-machine SQL tokenizer
│   ├── reporters/
│   │   ├── ConsoleReporter.ts       # ANSI terminal execution summary
│   │   └── ErdDashboardReporter.ts  # Single-file HTML ERD dashboard generator
│   ├── types/
│   │   └── index.ts                 # Strong TypeScript type definitions
│   ├── utils/
│   │   ├── ai.ts                    # Safe Gemini AI client wrapper
│   │   └── logger.ts                # Colored logger
│   └── index.ts                     # Public engine API & re-exports
├── samples/
│   ├── banking.sql                  # Composite PKs & banking ledger DDL
│   ├── circular.sql                 # Mutual circular FK & self-referential DDL
│   ├── ecommerce.sql                # 8-table e-commerce storefront DDL
│   └── saas.sql                     # 7-level multi-tenant SaaS hierarchy DDL
├── templates/
│   └── erd-dashboard.html           # Interactive Tailwind & Mermaid template
├── tests/
│   ├── use-cases/
│   │   ├── uc1-ecommerce-crud.test.ts
│   │   ├── uc2-deep-saas-hierarchy.test.ts
│   │   ├── uc3-circular-fk-self-ref.test.ts
│   │   ├── uc4-composite-keys-banking.test.ts
│   │   └── uc5-docker-sqlite-benchmark.test.ts
│   └── run-all.ts                   # Master automated test runner
├── package.json
└── tsconfig.json
```

---

## 🛠️ CLI Usage

```bash
# Generate synthetic data for an e-commerce schema
npm run synthdb -- generate -s samples/ecommerce.sql -o output/ecommerce --rows 50 --dialect postgres -f all

# Generate data with deterministic seed and verbose output
npm run synthdb -- generate -s samples/saas.sql --seed 1337 --rows 100 -v

# Generate standalone interactive HTML ERD report
npm run synthdb -- report -s samples/banking.sql -o reports/banking-erd.html
```

### CLI Options:
| Flag | Description | Default |
|------|-------------|---------|
| `-s, --schema <path>` | Path to SQL DDL schema file | `samples/ecommerce.sql` |
| `-o, --out <dir>` | Output directory for artifacts | `output` |
| `--seed <number>` | Deterministic PRNG seed | `42` |
| `-r, --rows <number>` | Default row count per table | `25` |
| `-d, --dialect <name>` | Target dialect (`postgres`, `mysql`, `sqlite`) | `postgres` |
| `-f, --formats <list>` | Export formats (`sql`, `sqlite`, `ndjson`, `csv`, `docker`, `all`) | `all` |
| `--ai` | Enable Gemini 2.5 Flash domain advisor | `false` |
| `-v, --verbose` | Enable debug logs | `false` |

---

## 💻 Programmatic TypeScript API

```typescript
import { SynthDB } from 'synthdb';
import * as fs from 'fs';

const ddl = fs.readFileSync('samples/ecommerce.sql', 'utf8');

const { database, summary, artifacts } = await SynthDB.run(ddl, {
  seed: 42,
  dialect: 'postgres',
  defaultRowCount: 50,
  rowCountPerTable: {
    users: 30,
    products: 100,
    orders: 150
  },
  formats: ['sql', 'ndjson', 'csv', 'docker'],
  outputDir: 'output/my_dataset'
});

console.log(`Generated ${summary.totalRows} rows across ${summary.totalTables} tables.`);
```

---

## 🧪 Automated Test Suites

Run the master test runner verifying all 5 core engineering use cases:

```bash
npm test
```

### Test Suites Covered:
1. **UC-1: E-Commerce CRUD & Referential Integrity**: Validates 8-table relational hierarchy, temporal chain monotonicity (`created_at <= updated_at <= shipped_at <= delivered_at`), Zipfian SKU distribution, and Luhn credit card validation.
2. **UC-2: Deep Multi-Tenant SaaS Hierarchy & Determinism**: Validates 7-level deep cascade foreign keys, Kahn's deterministic ordering, zero duplicate subdomains/slugs, and 100% byte-for-byte reproducibility across runs with identical seed.
3. **UC-3: Circular Foreign Keys & Self-Referential Graph**: Validates Tarjan's SCC cycle detector, 2-Pass update planning for `departments` $\leftrightarrow$ `employees`, and self-referential hierarchy resolution.
4. **UC-4: Composite Keys & Banking Ledger**: Validates composite primary keys `(branch_code, account_no)`, composite FKs, check constraints (`balance >= 0`, `amount > 0`), and SWIFT BIC compliance.
5. **UC-5: Multi-Format Exporters, Docker & High-Throughput Benchmarks**: Validates SQL batch exports, NDJSON fixtures, CSV tables, Docker compose scaffolds, interactive HTML ERD dashboard generation, and >10,000 rows/sec generation throughput.

---

> 📖 For detailed per-assertion logs, benchmark metrics, and reproducibility tests, see the [Full Test Execution Report (TEST_RESULTS.md)](./TEST_RESULTS.md).
