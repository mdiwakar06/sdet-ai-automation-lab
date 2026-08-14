# DriftGuard • Autonomous API Contract Drift Engine & JSON Schema / OpenAPI 3.1 Comparator

> **Autonomous API contract drift detection, runtime schema inference, Shannon entropy route normalization, and breaking change remediation for TypeScript & Playwright.**

---

## ⚡ Key Capabilities

1. **RFC 6901 Recursive AST Diff Engine**:
   - Deep structural comparison of OpenAPI 3.1 & JSON Schema Draft 2020-12 specifications.
   - Precise JSON pointer location resolution (`/paths/~1users~1{id}/get/responses/200/content/application~1json/schema/properties/email`).

2. **16-Point Breaking Change Matrix**:
   - Categorizes diffs into `CRITICAL_BREAKING`, `WARNING_RISK`, and `NON_BREAKING_ADDITION`.
   - Formal rules covering endpoint removal, type mutation, required request/response field drift, enum constraints, status codes, and nullability widening/narrowing.

3. **Multi-Stage Route Normalization & Shannon Entropy**:
   - Automatically maps dynamic URLs (`/api/v1/users/550e8400-e29b-41d4-a716-446655440000/orders/ord_987654`) to OpenAPI templates (`/api/v1/users/{userId}/orders/{orderId}`).
   - Shannon entropy $H(X)$ distinguishes random hashes/slugs from dictionary keywords (`/users/me`).

4. **Heterogeneous Payload Schema Inference**:
   - Aggregates runtime traffic samples and infers unified JSON Schemas with frequency-based `required` property classification.
   - Format detection: `uuid`, `date-time`, `email`, `ipv4`, `uri`.

5. **Zero-Overhead Playwright Interceptor**:
   - One-liner attachment (`DriftGuard.attach(page | context)`).
   - In-memory circular buffer with automated PII & credential masking.

6. **Interactive HTML Drift Dashboard**:
   - Modern Tailwind CSS dark-mode dashboard with live search, severity filters, expected vs actual diff viewers, and remediation advice.

7. **AI-Powered Remediation (Gemini 2.5 Flash)**:
   - Root-cause analysis, consumer impact risk rating, and actionable code/spec patches.

---

## 🚀 Quick Start

### Installation

```bash
npm install
npm run build
```

### Run All 5 Automated Test Suites

```bash
npm test
```

### CLI Commands

```bash
# Compare Baseline vs Observed Spec
npx driftguard diff baseline.json observed.json --html reports/diff-report.html --ai

# Infer OpenAPI 3.1 Spec from Runtime Traffic or HAR
npx driftguard infer captured-traffic.json -o openapi-spec.json

# Render HTML Dashboard from JSON Diff Report
npx driftguard report diff-result.json -o dashboard.html

# Update Baseline Spec with Safe Additions
npx driftguard update baseline.json observed.json -o updated-baseline.json
```

---

## 🛠 Playwright E2E Integration

```typescript
import { test } from '@playwright/test';
import { DriftGuard } from 'driftguard-contract-engine-typescript';

test('E2E Checkout Flow with Contract Drift Guard', async ({ page }) => {
  // 1. Attach interceptor
  DriftGuard.attach(page);

  // 2. Perform regular test actions
  await page.goto('https://app.example.com/checkout');
  await page.click('#submit-order');

  // 3. Infer OpenAPI spec from live network activity
  const observedSpec = DriftGuard.inferFromTraffic();

  // 4. Compare with Baseline OpenAPI contract
  const report = DriftGuard.compare(baselineSpec, observedSpec);
  DriftGuard.printReport(report);
  DriftGuard.exportHtmlReport(report, 'reports/checkout-drift.html');

  // 5. Assert contract integrity in CI
  expect(report.summary.isContractBroken).toBe(false);
});
```

---

## 📊 16-Point Breaking Change Rules

| Rule ID | Category | Change Type | Severity | Description |
| :--- | :--- | :--- | :--- | :--- |
| **BR-01** | `ENDPOINT` | `ENDPOINT_REMOVED` | `CRITICAL_BREAKING` | Baseline route missing in runtime |
| **BR-02** | `ENDPOINT` | `ENDPOINT_ADDED` | `NON_BREAKING_ADDITION` | New route added |
| **BR-03** | `METHOD` | `METHOD_REMOVED` | `CRITICAL_BREAKING` | HTTP method removed from route |
| **BR-04** | `METHOD` | `METHOD_ADDED` | `NON_BREAKING_ADDITION` | New HTTP method added |
| **BR-05** | `STATUS_CODE` | `STATUS_CODE_REMOVED` | `CRITICAL_BREAKING` | Expected response code missing |
| **BR-06** | `STATUS_CODE` | `STATUS_CODE_ADDED` | `WARNING_RISK` | Unexpected response status code |
| **BR-07** | `SCHEMA_FIELD` | `REQUIRED_RESPONSE_FIELD_REMOVED` | `CRITICAL_BREAKING` | Required field missing in response |
| **BR-08** | `SCHEMA_FIELD` | `OPTIONAL_RESPONSE_FIELD_REMOVED` | `WARNING_RISK` | Optional field missing in response |
| **BR-09** | `SCHEMA_FIELD` | `RESPONSE_FIELD_ADDED` | `NON_BREAKING_ADDITION` | New field added to response |
| **BR-10** | `SCHEMA_TYPE` | `FIELD_TYPE_CHANGED` | `CRITICAL_BREAKING` | Incompatible type mutation (e.g. number -> string) |
| **BR-11** | `NULLABILITY` | `NULLABILITY_WIDENED` | `CRITICAL_BREAKING` | Non-null field now returns null |
| **BR-12** | `NULLABILITY` | `NULLABILITY_NARROWED` | `NON_BREAKING_ADDITION` | Nullable field now non-null |
| **BR-13** | `ENUM_VALUE` | `ENUM_VALUE_REMOVED` | `CRITICAL_BREAKING` | Existing enum variant removed |
| **BR-14** | `ENUM_VALUE` | `ENUM_VALUE_ADDED` | `WARNING_RISK` | New enum variant added in response |
| **BR-15** | `REQUEST_BODY` | `REQUIRED_REQUEST_FIELD_ADDED` | `CRITICAL_BREAKING` | New required field in request payload |
| **BR-16** | `PARAMETER` | `REQUIRED_PARAM_ADDED` | `CRITICAL_BREAKING` | New required query/header parameter |

---

## 🧪 Automated Test Use Cases

- **UC-1**: Path Normalization & Shannon Entropy Route Clustering
- **UC-2**: Breaking Type Mutation & Required Field Removal
- **UC-3**: Enum Constraints, HTTP Status Codes & Nullability Widening
- **UC-4**: Backward-Compatible Evolution & Additive Contracts
- **UC-5**: End-to-End Live Playwright Interception, Express Microservice & HTML Dashboard Generation
