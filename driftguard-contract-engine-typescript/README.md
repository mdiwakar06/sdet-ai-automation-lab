# 🛡️ DriftGuard • Zero-Config Observation-Driven API Contract Drift Engine

> **Autonomous API Contract Drift Detection, Living Schema Inference, Shannon Entropy Route Normalization & AI-Powered Breaking Change Remediation for TypeScript & Playwright.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.47-green?logo=playwright)](https://playwright.dev/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1.0-orange?logo=openapi-initiative)](https://spec.openapis.org/oas/v3.1.0)
[![Test Suite](https://img.shields.io/badge/Tests-53%2F53%20Passing-brightgreen)](TEST_RESULTS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📑 Test Execution & Verification

👉 **Full SDET Automated Test Suite Report:** [**TEST_RESULTS.md**](TEST_RESULTS.md)
* **Suites Executed:** 5 / 5 (100% Pass)
* **Total Assertions Verified:** 53 / 53 (100% Pass)
* **Execution Time:** ~5.06s (Deterministic & Resilient)

---

## 💡 What is DriftGuard in Simple Terms?

Imagine you are running an e-commerce platform. One Friday afternoon, a backend engineer deploys an update to the Checkout & Order microservice:
* They rename `total_amount` to `totalAmount` in the JSON response.
* Or they change `price` from a number `19.99` to a formatted string `"19.99"`.
* Or they introduce a new mandatory request parameter `taxIdentifier`.

They forget to notify the frontend and QA teams. Suddenly, the checkout flow **crashes in production** because the frontend gets `undefined` or `NaN` when computing order totals, and new orders fail with `400 Bad Request`.

### ❌ Why Traditional Contract Testing (Pact / Schema Validators) Fails
1. **High Maintenance Overhead:** Traditional tools require QA/SDET engineers to write and maintain hundreds of mock contract test files (`*.pact.json`).
2. **Abandoned by Over 85% of Teams:** When APIs evolve rapidly, maintaining separate mock test suites becomes a bottleneck and gets abandoned.
3. **Spec vs. Reality Divergence:** Static OpenAPI YAML files written by hand in Swagger Hub quickly drift from what the actual microservices produce in runtime.

---

## ✨ The DriftGuard Solution: Zero-Maintenance Contract Testing

**DriftGuard delivers 100% contract test coverage with ZERO extra test files to write.** 

It hooks into your existing Playwright E2E UI or API test runs as a lightweight network observer, captures real HTTP/JSON traffic, normalizes dynamic routes, infers living OpenAPI 3.1 contracts, and alerts immediately on breaking changes with AI-suggested code fixes.

```
┌─────────────────────────────────────────────────────────────────┐
│              Your Existing Playwright E2E / API Tests           │
└────────────────────────────────┬────────────────────────────────┘
                                 │ (Executes normal test flows)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│             🛡️ DriftGuard Zero-Overhead Interceptor             │
│    - Non-blocking circular buffer & automatic PII scrubber      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               ⚡ Core Engine Processing Pipeline                │
│                                                                 │
│  1. Shannon Entropy Route Normalizer:                           │
│     /users/550e8400-e29b-41d4-a716-446655440000 ➔ /users/{id}   │
│                                                                 │
│  2. Living Schema Draft 2020-12 Inferrer:                       │
│     Infers union types, format detectors, optional/required    │
│                                                                 │
│  3. RFC 6901 Recursive AST Comparator:                          │
│     Deep structural diff against Baseline OpenAPI 3.1 Contract  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  🚨 Actionable SDET Deliverables                │
│                                                                 │
│  • 16-Point Breaking Change Classification (CRITICAL / WARNING) │
│  • 🤖 Gemini 2.5 Flash AI Remediation Patches & Code Snippets   │
│  • 📊 Interactive Dark-Mode HTML Drift Dashboard                │
│  • 🛑 Immediate CI Pipeline Gate (fail-on-breaking)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Technical Capabilities

### 1. Multi-Stage Route Normalization & Shannon Entropy Clustering
APIs produce hundreds of unique URLs containing dynamic path variables. DriftGuard normalizes arbitrary URLs into OpenAPI route templates:
- **UUID & ULID Detection:** Matches RFC 4122 and Crockford Base32 IDs.
- **MongoDB ObjectId & Numeric IDs:** Auto-identifies `507f1f77bcf86cd799439011` and `49281`.
- **Prefixed Identifiers:** Recognizes Stripe/Shopify style tokens (`cust_9876543210ab`).
- **Shannon Entropy Calculation ($H(X)$):**
  $$H(X) = -\sum_{i=1}^n P(x_i) \log_2 P(x_i)$$
  Distinguishes high-entropy random hashes/slugs (`x8f2a9c4b1d7e3f0`, $H=3.88$) from static dictionary keywords (`/users/me`, `/health`, `/orders/summary`).

### 2. Autonomous Living Schema Inference (JSON Schema Draft 2020-12)
Aggregates heterogeneous payloads observed during test runs and infers unified schema representations:
- **Frequency-Based Required/Optional Classification:** Fields appearing in 100% of samples are classified as `required`, while conditional properties remain optional.
- **Semantic Format Detection:** Automatically tags strings with formats: `uuid`, `date-time`, `date`, `time`, `email`, `ipv4`, `ipv6`, `uri`.
- **Union & Nullability Inference:** Accurately models nullable types (`['string', 'null']`).

### 3. RFC 6901 Recursive AST Diff Engine & 16-Point Taxonomy
Performs deep structural comparison between Baseline and Observed OpenAPI 3.1 documents with canonical JSON pointer resolution (`/paths/~1users~1{userId}/get/responses/200/content/application~1json/schema/properties/price`).

| Rule ID | Category | Change Type | Severity | Description |
| :--- | :--- | :--- | :--- | :--- |
| **BR-01** | `ENDPOINT` | `ENDPOINT_REMOVED` | `CRITICAL_BREAKING` | Baseline route missing from runtime traffic |
| **BR-02** | `ENDPOINT` | `ENDPOINT_ADDED` | `NON_BREAKING_ADDITION` | Safe additive new route introduced |
| **BR-03** | `METHOD` | `METHOD_REMOVED` | `CRITICAL_BREAKING` | HTTP method removed from endpoint |
| **BR-04** | `METHOD` | `METHOD_ADDED` | `NON_BREAKING_ADDITION` | New HTTP method added to endpoint |
| **BR-05** | `STATUS_CODE` | `STATUS_CODE_REMOVED` | `CRITICAL_BREAKING` | Expected status code (e.g. 404) not observed |
| **BR-06** | `STATUS_CODE` | `STATUS_CODE_ADDED` | `WARNING_RISK` | Unexpected status code (e.g. 500) observed |
| **BR-07** | `SCHEMA_FIELD` | `REQUIRED_RESPONSE_FIELD_REMOVED` | `CRITICAL_BREAKING` | Required response property missing |
| **BR-08** | `SCHEMA_FIELD` | `OPTIONAL_RESPONSE_FIELD_REMOVED` | `WARNING_RISK` | Optional response property missing |
| **BR-09** | `SCHEMA_FIELD` | `RESPONSE_FIELD_ADDED` | `NON_BREAKING_ADDITION` | Additive response field (Tolerant Reader) |
| **BR-10** | `SCHEMA_TYPE` | `FIELD_TYPE_CHANGED` | `CRITICAL_BREAKING` | Incompatible type mutation (e.g. number -> string) |
| **BR-11** | `NULLABILITY` | `NULLABILITY_WIDENED` | `CRITICAL_BREAKING` | Guaranteed non-null field becomes nullable |
| **BR-12** | `NULLABILITY` | `NULLABILITY_NARROWED` | `NON_BREAKING_ADDITION` | Nullable field becomes non-null |
| **BR-13** | `ENUM_VALUE` | `ENUM_VALUE_REMOVED` | `CRITICAL_BREAKING` | Existing enum variant removed |
| **BR-14** | `ENUM_VALUE` | `ENUM_VALUE_ADDED` | `WARNING_RISK` | New enum variant added in response |
| **BR-15** | `REQUEST_BODY` | `REQUIRED_REQUEST_FIELD_ADDED` | `CRITICAL_BREAKING` | New required field in request payload |
| **BR-16** | `PARAMETER` | `REQUIRED_PARAM_ADDED` | `CRITICAL_BREAKING` | New required query or header parameter |

### 4. AI-Powered Remediation (Gemini 2.5 Flash & Heuristic Fallback)
For every detected breaking change, DriftGuard synthesizes:
- **Root-Cause Analysis:** Why the drift occurred.
- **Consumer Impact Assessment:** `HIGH`, `MEDIUM`, or `LOW` risk.
- **Actionable TypeScript/Zod Code Patches:** Drop-in code fixes for backend and frontend engineers.

### 5. Interactive HTML Drift Dashboard
Generates a standalone, dependency-free Tailwind CSS dark-mode dashboard featuring live search, severity filters, expected vs. actual side-by-side AST comparisons, and exportable JSON reports.

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/diwakarreddym/sdet-ai-automation-lab.git
cd sdet-ai-automation-lab/driftguard-contract-engine-typescript
npm install
npm run build
```

### Run the Complete Automated Test Suite

```bash
npm test
```

---

## 💻 CLI Usage

DriftGuard includes a full-featured CLI executable (`driftguard`):

```bash
# 1. Compare baseline contract against observed spec with AI advice and HTML report
npx driftguard diff samples/baseline.json samples/observed.json --html reports/diff-report.html --ai

# 2. Infer OpenAPI 3.1 spec from captured runtime JSON or HAR file
npx driftguard infer captured-traffic.har -o openapi-spec.json --title "Inferred Store API"

# 3. Render HTML Dashboard from an existing JSON drift report
npx driftguard report reports/drift-summary.json -o dashboard.html

# 4. Safely update baseline spec with non-breaking additions
npx driftguard update samples/baseline.json samples/observed.json -o updated-baseline.json
```

---

## 🛠️ Playwright Integration Example

Integrate DriftGuard into any existing Playwright test suite in less than 5 lines of code:

```typescript
import { test, expect } from '@playwright/test';
import { DriftGuard } from 'driftguard-contract-engine-typescript';
import baselineContract from './contracts/baseline-openapi.json';

test.describe('E-Commerce Checkout Contract Drift Guard', () => {
  test('E2E Purchase Flow with Zero-Config Contract Testing', async ({ page }) => {
    // Step 1: Attach zero-overhead network listener
    DriftGuard.attach(page);

    // Step 2: Execute normal user interactions
    await page.goto('https://shop.example.com/products/prod_101');
    await page.click('#add-to-cart');
    await page.goto('https://shop.example.com/checkout');
    await page.fill('#card-number', '4242424242424242');
    await page.click('#place-order');

    // Step 3: Automatically infer living OpenAPI 3.1 spec from captured traffic
    const observedSpec = DriftGuard.inferFromTraffic();

    // Step 4: Compare living runtime contract against production baseline
    const report = DriftGuard.compare(baselineContract, observedSpec);
    
    // Step 5: Export interactive HTML report
    DriftGuard.exportHtmlReport(report, 'reports/checkout-drift-report.html');
    DriftGuard.printReport(report);

    // Step 6: Fail CI if critical breaking changes occurred
    expect(report.summary.isContractBroken).toBe(false);
  });
});
```

---

## 🧪 Automated Test Suites & Coverage

| Suite ID | Test Description | Assertions | Status |
| :--- | :--- | :---: | :---: |
| **UC-1** | Route Normalization, Shannon Entropy Clustering & HAR Ingestion | **17** | ✅ PASS |
| **UC-2** | Living Schema Inference, Type Mutation & Required Field Removal | **12** | ✅ PASS |
| **UC-3** | Enum Constraints, Status Codes & Response Nullability Drift | **7** | ✅ PASS |
| **UC-4** | Backward-Compatible Evolution & Additive Contracts | **7** | ✅ PASS |
| **UC-5** | Playwright E2E Traffic Interception, AI Remediation & HTML Dashboard | **10** | ✅ PASS |
| **Total** | **Comprehensive Full-Spectrum Contract Testing Suite** | **53** | ✅ **100% PASS** |

Detailed verification metrics, rule IDs, and execution timings are documented in [**TEST_RESULTS.md**](TEST_RESULTS.md).

---

## 👥 Authors & SDET Architecture

- **Lead SDET & Contract Testing Architect:** DriftGuard Squad
- **Repository:** `sdet-ai-automation-lab/driftguard-contract-engine-typescript`
- **License:** MIT
