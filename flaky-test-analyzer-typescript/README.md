# 🚀 SDET Automation Lab: Flaky Analyzer & TraceRCA

A comprehensive developer operations (DevEx) and test engineering toolkit. It features a traditional **Flaky Test Analyzer** (calculating status transitions across runs) and **TraceRCA**—an **AI-Powered Test Failure Root-Cause Analysis CLI & custom Playwright Reporter**.

---

## 📦 Project Structure

```
flaky-test-analyzer-typescript/
├── src/
│   ├── index.ts                      # CLI router (analyze, report, formats, tracerca)
│   ├── types.ts                      # Unified types for flakiness & TraceRCA
│   ├── analyzer.ts                   # Traditional flakiness scoring calculations
│   ├── playwright-reporter.ts        # Playwright custom reporter entry point (NEW)
│   ├── parsers/                      # JUnit XML, Jest JSON, and Playwright ZIP parsers
│   ├── sanitization/                 # AST JSON scrubber & regex masking engine (NEW)
│   ├── ai/                           # Gemini SDK connector & prompt compiler (NEW)
│   └── reporters/                    # Console cards, JSON output, & Tailwind HTML dashboards
├── tracerca.config.json              # Config parameters for PII redacting & cost caps (NEW)
└── README.md                         # This documentation
```

---

## 🩹 Module 1: TraceRCA (AI Failure Root-Cause Analyzer)

TraceRCA intercepts Playwright test failures, programmatically inspects trace ZIP archives, scrubs sensitive PII/secrets locally, and utilizes the Gemini API with strict structured outputs to classify bugs.

### 🌟 Core Capabilities
* **Programmatic Trace Extraction**: Streams logs from `trace.zip` (`trace.playwright-trace` and `trace.network`) in memory. It pulls the last 10 user actions, console warnings/errors, and HTTP response bodies for status codes $\ge 400$ without launching heavy browsers in CI.
* **AST & Regex PII Sanitization**: Cleans headers (authorization tokens, cookies) and deep JSON body keys (passwords, credit cards, emails, SSNs) locally before transmitting data to the LLM.
* **Prompt Injection Protection**: Uses Gemini's native **Structured Outputs (`responseSchema`)** to enforce schema responses, preventing hijackers from manipulating the classification output.
* **CI Cost Controls**: Caps analyses per run (default: 5) to prevent rate limits and cost spikes during environment outages. Only analyzes failures on the final retry step.
* **Graceful Fallbacks**: Automatically falls back to standard Playwright Reporter API logs (`result.errors` and `stdout/stderr`) if trace files are missing or trace parsing fails.

---

### 🚦 Quick Start (TraceRCA)

#### 1. Setup API Key
TraceRCA reads the Gemini API Key from your environment:
```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

#### 2. Configure PII & Limits
Adjust rules inside `tracerca.config.json`:
```json
{
  "sanitization": {
    "maskValue": "[REDACTED_BY_TRACERCA]",
    "sensitiveHeaders": ["authorization", "cookie"],
    "sensitiveKeys": ["password", "token", "creditcard", "email", "key"]
  },
  "analysis": {
    "maxAnalyses": 5
  }
}
```

#### 3. Integrate with Playwright
Register the reporter in `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['./flaky-test-analyzer-typescript/dist/playwright-reporter']
  ],
  use: {
    trace: 'retain-on-failure', // Required to generate trace.zip files
  }
});
```

---

### 🎛️ TraceRCA CLI Subcommands

Once built, the CLI provides two primary diagnostic commands:

#### 1. `flaky tracerca analyze`
Manually parse trace files and run AI triaging.
```bash
# Analyze trace zip files matching a glob pattern
npx flaky tracerca analyze "test-results/**/*.zip"
```

#### 2. `flaky tracerca report`
Generate the interactive slate-themed HTML dashboard from cached runs.
```bash
# Finds the latest run and writes 'tracerca-report.html'
npx flaky tracerca report
```

---

## 📊 Module 2: Flaky Test Analyzer (Traditional calculation)

Calculates test reliability scores across multiple execution reports to flag unstable test runs.

### 🌟 Core Capabilities
* **Transitions-based Scoring**: Uses status transitions (`✓ ✗ ✓ ✗` = 100% flakiness, `✓ ✓ ✓` = 0% flakiness).
* **Multi-format support**: JUnit XML (pytest, Maven), Jest JSON (`--json`), Playwright JSON.
* **Auto-detection**: Automatically matches files to the correct parser.

### 🚦 CLI Usage
```bash
# Analyze JUnit XML reports
flaky analyze "results/run-*.xml"

# Analyze with custom threshold (default: 10%)
flaky analyze "results/*.xml" -t 20

# Require minimum 3 runs to calculate flakiness
flaky analyze "results/*.xml" -m 3
```

---

## 🛠️ Build and Test

### Compile Project
```bash
npm install
npm run build
```

### Run Scrubber & Parser Validation Sandbox
```bash
# Simulates zip parsing and verifies AST scrubbing masks PII
npx ts-node src/test-scrub-parse.ts
```

## 📄 License
MIT
